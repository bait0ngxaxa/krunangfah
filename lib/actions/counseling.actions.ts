/**
 * Server Actions for Counseling Sessions
 * การจัดการบันทึกการให้คำปรึกษา
 *
 * Access control:
 * - school_admin: ดูได้ทุกนักเรียนในโรงเรียน
 * - class_teacher: ดูได้เฉพาะนักเรียนในห้องที่ดูแล (advisoryClass)
 */

"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { logError } from "@/lib/utils/logging";
import { handleActionError } from "./error-handler";
import { handleQueryError } from "./error-handler";
import { queryEmpty, querySuccess, type QueryResult } from "./query-result";
import { verifyStudentAccessForUser } from "@/lib/security/student-access";
import {
    COUNSELING_ACADEMIC_YEAR_DATE_ERROR_MESSAGE,
    counselingSessionSchema,
} from "@/lib/validations/counseling.validation";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import type { OffsetPagination } from "@/types/pagination.types";
import type { AcademicYearDateRange } from "@/lib/utils/student-detail-filters";
import { isDateWithinAcademicYear } from "@/lib/utils/academic-year";
import {
    canMutateAcademicYearContext,
    LATEST_CARE_RECORD_ONLY_MESSAGE,
} from "@/lib/actions/care-record-current-policy";

export interface CounselingSession {
    id: string;
    sessionNumber: number;
    sessionDate: Date;
    counselorName: string;
    summary: string;
    createdAt: Date;
}

interface CreatedCounselingSession {
    id: string;
    studentId: string;
    academicYearId: string | null;
    sessionNumber: number;
    sessionDate: Date;
    counselorName: string;
    summary: string;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface CreateCounselingSessionResult {
    success: boolean;
    message?: string;
    session?: CreatedCounselingSession;
}

const MAX_SESSION_NUMBER_RETRIES = 3;
const DEFAULT_COUNSELING_PAGE_SIZE = 10;
const MAX_COUNSELING_PAGE_SIZE = 50;

function normalizePaginationParams(
    page?: number,
    pageSize?: number,
): { page: number; pageSize: number } {
    const safePage =
        typeof page === "number" && Number.isInteger(page) && page > 0 ? page : 1;
    const safePageSize =
        typeof pageSize === "number" &&
        Number.isInteger(pageSize) &&
        pageSize > 0 &&
        pageSize <= MAX_COUNSELING_PAGE_SIZE
            ? pageSize
            : DEFAULT_COUNSELING_PAGE_SIZE;

    return { page: safePage, pageSize: safePageSize };
}

interface ResolvedAcademicYear {
    id: string;
    startDate: Date;
    endDate: Date;
}

async function resolveAcademicYear(
    academicYearId?: string,
): Promise<ResolvedAcademicYear | null> {
    if (academicYearId) {
        const selectedYear = await prisma.academicYear.findUnique({
            where: { id: academicYearId },
            select: { id: true, startDate: true, endDate: true },
        });
        return selectedYear;
    }

    const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
        select: { id: true, startDate: true, endDate: true },
    });
    return currentYear;
}

function buildAcademicYearRecordFilter(
    academicYearId?: string,
    dateRange?: AcademicYearDateRange,
): Prisma.CounselingSessionWhereInput {
    if (academicYearId && dateRange) {
        return {
            OR: [
                { academicYearId },
                {
                    academicYearId: null,
                    sessionDate: {
                        gte: dateRange.startDate,
                        lte: dateRange.endDate,
                    },
                },
            ],
        };
    }

    if (academicYearId) {
        return { academicYearId };
    }

    if (dateRange) {
        return {
            sessionDate: {
                gte: dateRange.startDate,
                lte: dateRange.endDate,
            },
        };
    }

    return {};
}

export interface CounselingSessionListResponse {
    sessions: CounselingSession[];
    pagination: OffsetPagination;
}

/**
 * Get all counseling sessions for a student
 */
export async function getCounselingSessions(
    studentId: string,
    options?: {
        page?: number;
        pageSize?: number;
        academicYearId?: string;
        dateRange?: AcademicYearDateRange;
    },
): Promise<QueryResult<CounselingSessionListResponse>> {
    const { page: requestedPage, pageSize } = normalizePaginationParams(
        options?.page,
        options?.pageSize,
    );

    try {
        const session = await requireAuth();
        const { allowed, error } = await verifyStudentAccessForUser({
            studentId,
            userId: session.user.id,
            userRole: session.user.role,
        });

        if (!allowed) {
            logError("Access denied:", error);
            return { status: "forbidden" };
        }

        const whereClause: Prisma.CounselingSessionWhereInput = {
            studentId,
            deletedAt: null,
            ...buildAcademicYearRecordFilter(
                options?.academicYearId,
                options?.dateRange,
            ),
        };
        const total = await prisma.counselingSession.count({
            where: whereClause,
        });
        const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
        const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);

        const sessions =
            total === 0
                ? []
                : await prisma.counselingSession.findMany({
                      where: whereClause,
                      orderBy: { sessionNumber: "asc" },
                      skip: (page - 1) * pageSize,
                      take: pageSize,
                      select: {
                          id: true,
                          sessionNumber: true,
                          sessionDate: true,
                          counselorName: true,
                          summary: true,
                          createdAt: true,
                      },
                  });

        const data: CounselingSessionListResponse = {
            sessions,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
        return total === 0 ? queryEmpty(data) : querySuccess(data);
    } catch (error) {
        return handleQueryError("Error fetching counseling sessions:", error);
    }
}

/**
 * Create a new counseling session
 */
export async function createCounselingSession(data: {
    studentId: string;
    academicYearId?: string;
    sessionDate: Date;
    counselorName: string;
    summary: string;
}): Promise<CreateCounselingSessionResult> {
    try {
        // Validate input
        const validated = counselingSessionSchema.parse(data);

        const session = await requireAuth();

        // system_admin เป็น readonly — ไม่สามารถเพิ่มบันทึกได้
        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminReadonlyActivity,
            };
        }

        const userId = session.user.id;

        // Verify access
        const { allowed, error } = await verifyStudentAccessForUser({
            studentId: validated.studentId,
            userId,
            userRole: session.user.role,
            mode: "manage",
        });

        if (!allowed) {
            return { success: false, message: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const academicYear = await resolveAcademicYear(
            validated.academicYearId,
        );
        if (!academicYear) {
            return { success: false, message: "ไม่พบปี/เทอมสำหรับบันทึกนี้" };
        }
        if (!isDateWithinAcademicYear(validated.sessionDate, academicYear)) {
            return {
                success: false,
                message: COUNSELING_ACADEMIC_YEAR_DATE_ERROR_MESSAGE,
            };
        }

        let counselingSession: CreatedCounselingSession | undefined;

        for (let attempt = 0; attempt < MAX_SESSION_NUMBER_RETRIES; attempt++) {
            try {
                const transactionResult = await prisma.$transaction(
                    async (tx) => {
                        const isCurrentContext =
                            await canMutateAcademicYearContext(
                                validated.studentId,
                                academicYear.id,
                                tx,
                            );
                        if (!isCurrentContext) {
                            return { kind: "historical" } as const;
                        }

                        const sessionNumbers =
                            await tx.counselingSession.aggregate({
                                where: { studentId: validated.studentId },
                                _max: { sessionNumber: true },
                            });

                        const sessionNumber =
                            (sessionNumbers._max.sessionNumber ?? 0) + 1;

                        const created = await tx.counselingSession.create({
                            data: {
                                studentId: validated.studentId,
                                academicYearId: academicYear.id,
                                sessionNumber,
                                sessionDate: validated.sessionDate,
                                counselorName: validated.counselorName,
                                summary: validated.summary,
                                createdById: userId,
                            },
                        });
                        return { kind: "created", created } as const;
                    },
                    {
                        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                    },
                );
                if (transactionResult.kind === "historical") {
                    return {
                        success: false,
                        message: LATEST_CARE_RECORD_ONLY_MESSAGE,
                    };
                }
                counselingSession = transactionResult.created;
                break;
            } catch (txError) {
                if (
                    txError instanceof Prisma.PrismaClientKnownRequestError &&
                    (txError.code === "P2002" || txError.code === "P2034") &&
                    attempt < MAX_SESSION_NUMBER_RETRIES - 1
                ) {
                    continue;
                }
                throw txError;
            }
        }

        if (!counselingSession) {
            return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
        }

        revalidatePath(`/students/${validated.studentId}`);

        return { success: true, session: counselingSession };
    } catch (error) {
        return handleActionError({
            context: "Error creating counseling session:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
            },
        });
    }
}

