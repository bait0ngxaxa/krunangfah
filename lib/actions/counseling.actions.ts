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
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { logError } from "@/lib/utils/logging";
import { handleActionError } from "./error-handler";
import { verifyStudentAccessForUser } from "@/lib/security/student-access";
import {
    counselingSessionSchema,
} from "@/lib/validations/counseling.validation";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import type { OffsetPagination } from "@/types/pagination.types";
import type { AcademicYearDateRange } from "@/lib/utils/student-detail-filters";

export interface CounselingSession {
    id: string;
    sessionNumber: number;
    sessionDate: Date;
    counselorName: string;
    summary: string;
    createdAt: Date;
}

const MAX_SESSION_NUMBER_RETRIES = 3;
const DEFAULT_COUNSELING_PAGE_SIZE = 10;
const MAX_COUNSELING_PAGE_SIZE = 50;

function buildEmptyPagination(pageSize: number): OffsetPagination {
    return {
        page: 1,
        pageSize,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    };
}

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

async function resolveAcademicYearId(
    academicYearId?: string,
): Promise<string | null> {
    if (academicYearId) {
        const selectedYear = await prisma.academicYear.findUnique({
            where: { id: academicYearId },
            select: { id: true },
        });
        return selectedYear?.id ?? null;
    }

    const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
        select: { id: true },
    });
    return currentYear?.id ?? null;
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
): Promise<CounselingSessionListResponse> {
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
            return {
                sessions: [],
                pagination: buildEmptyPagination(pageSize),
            };
        }

        const whereClause: Prisma.CounselingSessionWhereInput = {
            studentId,
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

        return {
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
    } catch (error) {
        return handleActionError({
            context: "Error fetching counseling sessions:",
            error,
            fallback: {
                sessions: [],
                pagination: buildEmptyPagination(pageSize),
            },
        });
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
}) {
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
        });

        if (!allowed) {
            return { success: false, message: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const academicYearId = await resolveAcademicYearId(
            validated.academicYearId,
        );
        if (!academicYearId) {
            return { success: false, message: "ไม่พบปี/เทอมสำหรับบันทึกนี้" };
        }

        let counselingSession:
            | {
                  id: string;
                  studentId: string;
                  academicYearId: string | null;
                  sessionNumber: number;
                  sessionDate: Date;
                  counselorName: string;
                  summary: string;
                  createdById: string;
                  createdAt: Date;
                  updatedAt: Date;
              }
            | undefined;

        for (let attempt = 0; attempt < MAX_SESSION_NUMBER_RETRIES; attempt++) {
            try {
                counselingSession = await prisma.$transaction(
                    async (tx) => {
                        const lastSession = await tx.counselingSession.findFirst({
                            where: { studentId: validated.studentId },
                            orderBy: { sessionNumber: "desc" },
                            select: { sessionNumber: true },
                        });

                        const sessionNumber = (lastSession?.sessionNumber || 0) + 1;

                        return tx.counselingSession.create({
                            data: {
                                studentId: validated.studentId,
                                academicYearId,
                                sessionNumber,
                                sessionDate: validated.sessionDate,
                                counselorName: validated.counselorName,
                                summary: validated.summary,
                                createdById: userId,
                            },
                        });
                    },
                    {
                        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                    },
                );
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

