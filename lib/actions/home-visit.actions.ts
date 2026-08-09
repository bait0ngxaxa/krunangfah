/**
 * Server Actions for Home Visits
 * การจัดการบันทึกการเยี่ยมบ้านนักเรียน
 *
 * Access control:
 * - system_admin: ดูได้ทุกนักเรียน (readonly)
 * - school_admin: ดูได้ทุกนักเรียนในโรงเรียน
 * - class_teacher: ดูได้เฉพาะนักเรียนในห้องที่ดูแล
 */

"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import {
    HOME_VISIT_ACADEMIC_YEAR_DATE_ERROR_MESSAGE,
    createHomeVisitSchema,
    deleteHomeVisitSchema,
} from "@/lib/validations/home-visit.validation";
import { logError } from "@/lib/utils/logging";
import { handleActionError } from "./error-handler";
import { handleQueryError } from "./error-handler";
import { queryEmpty, querySuccess, type QueryResult } from "./query-result";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import { verifyStudentAccessForUser } from "@/lib/security/student-access";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";
import { isDateWithinAcademicYear } from "@/lib/utils/academic-year";
import type { OffsetPagination } from "@/types/pagination.types";
import type { AcademicYearDateRange } from "@/lib/utils/student-detail-filters";
import {
    canMutateAcademicYearContext,
    LATEST_CARE_RECORD_ONLY_MESSAGE,
} from "@/lib/actions/care-record-current-policy";

const MAX_VISIT_NUMBER_RETRIES = 3;
const DEFAULT_HOME_VISIT_PAGE_SIZE = 5;
const MAX_HOME_VISIT_PAGE_SIZE = 50;

export interface HomeVisitPhotoData {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
}

export interface HomeVisitData {
    id: string;
    visitNumber: number;
    visitDate: Date;
    description: string;
    nextScheduledDate: Date | null;
    teacherName: string;
    teacherRole: string;
    photos: HomeVisitPhotoData[];
    createdAt: Date;
}

export interface HomeVisitListResponse {
    visits: HomeVisitData[];
    pagination: OffsetPagination;
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
        pageSize <= MAX_HOME_VISIT_PAGE_SIZE
            ? pageSize
            : DEFAULT_HOME_VISIT_PAGE_SIZE;

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

interface SoftDeleteHomeVisitInput {
    visitId: string;
    deletedById: string;
}

async function softDeleteHomeVisitAndEnqueueFiles(
    input: SoftDeleteHomeVisitInput,
): Promise<"deleted" | "historical" | "not-found"> {
    return runSerializableTransaction(async (tx) => {
        const visitWithPhotos = await tx.homeVisit.findUnique({
            where: { id: input.visitId, deletedAt: null },
            select: {
                studentId: true,
                academicYearId: true,
                photos: { select: { fileUrl: true } },
            },
        });
        if (!visitWithPhotos) {
            return "not-found";
        }

        const isCurrentContext = await canMutateAcademicYearContext(
            visitWithPhotos.studentId,
            visitWithPhotos.academicYearId,
            tx,
        );
        if (!isCurrentContext) {
            return "historical";
        }

        await tx.homeVisit.update({
            where: { id: input.visitId },
            data: {
                deletedAt: new Date(),
                deletedById: input.deletedById,
                deleteReason: "ผู้ใช้ลบบันทึกเยี่ยมบ้าน",
            },
        });
        if (visitWithPhotos.photos.length > 0) {
            await tx.fileDeletionOutbox.createMany({
                data: visitWithPhotos.photos.map((photo) => ({
                    fileUrl: photo.fileUrl,
                })),
                skipDuplicates: true,
            });
        }

        return "deleted";
    });
}

function buildAcademicYearRecordFilter(
    academicYearId?: string,
    dateRange?: AcademicYearDateRange,
): Prisma.HomeVisitWhereInput {
    if (academicYearId && dateRange) {
        return {
            OR: [
                { academicYearId },
                {
                    academicYearId: null,
                    visitDate: {
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
            visitDate: {
                gte: dateRange.startDate,
                lte: dateRange.endDate,
            },
        };
    }

    return {};
}

/**
 * Get all home visits for a student
 */
export async function getHomeVisits(
    studentId: string,
    options?: {
        page?: number;
        pageSize?: number;
        academicYearId?: string;
        dateRange?: AcademicYearDateRange;
    },
): Promise<QueryResult<HomeVisitListResponse>> {
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

        const whereClause: Prisma.HomeVisitWhereInput = {
            studentId,
            deletedAt: null,
            ...buildAcademicYearRecordFilter(
                options?.academicYearId,
                options?.dateRange,
            ),
        };
        const total = await prisma.homeVisit.count({
            where: whereClause,
        });
        const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
        const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);

        const visits =
            total === 0
                ? []
                : await prisma.homeVisit.findMany({
                      where: whereClause,
                      orderBy: { visitNumber: "desc" },
                      skip: (page - 1) * pageSize,
                      take: pageSize,
                      select: {
                          id: true,
                          visitNumber: true,
                          visitDate: true,
                          description: true,
                          nextScheduledDate: true,
                          teacherName: true,
                          teacherRole: true,
                          createdAt: true,
                          photos: {
                              select: {
                                  id: true,
                                  fileName: true,
                                  fileUrl: true,
                                  fileType: true,
                                  fileSize: true,
                              },
                              orderBy: { uploadedAt: "asc" },
                          },
                      },
                  });

        const data: HomeVisitListResponse = {
            visits,
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
        return handleQueryError("Error fetching home visits:", error);
    }
}

/**
 * Create a new home visit record
 */
export async function createHomeVisit(data: {
    studentId: string;
    academicYearId?: string;
    visitDate: Date;
    description: string;
    nextScheduledDate?: Date;
}): Promise<{ success: boolean; message?: string; visitId?: string }> {
    try {
        const validated = createHomeVisitSchema.parse(data);
        const session = await requireAuth();

        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminReadonly("แก้ไขข้อมูล"),
            };
        }

        const userId = session.user.id;

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
        if (!isDateWithinAcademicYear(validated.visitDate, academicYear)) {
            return {
                success: false,
                message: HOME_VISIT_ACADEMIC_YEAR_DATE_ERROR_MESSAGE,
            };
        }

        // Get teacher info for snapshot
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                teacher: {
                    select: { firstName: true, lastName: true, advisoryClass: true },
                },
            },
        });

        const teacherName = user?.teacher
            ? `${user.teacher.firstName} ${user.teacher.lastName}`
            : "ไม่ระบุ";

        let teacherRole = "ไม่ระบุ";
        if (user?.role === "school_admin") {
            teacherRole = "ครูนางฟ้า";
        } else if (user?.role === "class_teacher" && user.teacher?.advisoryClass) {
            teacherRole = `ครูประจำชั้น ห้อง ${user.teacher.advisoryClass}`;
        }

        let visit:
            | {
                  id: string;
              }
            | undefined;

        for (let attempt = 0; attempt < MAX_VISIT_NUMBER_RETRIES; attempt++) {
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

                        const visitNumbers = await tx.homeVisit.aggregate({
                            where: { studentId: validated.studentId },
                            _max: { visitNumber: true },
                        });

                        const visitNumber =
                            (visitNumbers._max.visitNumber ?? 0) + 1;

                        const created = await tx.homeVisit.create({
                            data: {
                                studentId: validated.studentId,
                                academicYearId: academicYear.id,
                                visitNumber,
                                visitDate: validated.visitDate,
                                description: validated.description,
                                nextScheduledDate: validated.nextScheduledDate,
                                teacherName,
                                teacherRole,
                                createdById: userId,
                            },
                            select: { id: true },
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
                visit = transactionResult.created;
                break;
            } catch (txError) {
                if (
                    txError instanceof Prisma.PrismaClientKnownRequestError &&
                    (txError.code === "P2002" || txError.code === "P2034") &&
                    attempt < MAX_VISIT_NUMBER_RETRIES - 1
                ) {
                    continue;
                }
                throw txError;
            }
        }

        if (!visit) {
            return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
        }

        revalidatePath(`/students/${validated.studentId}`);

        return { success: true, visitId: visit.id };
    } catch (error) {
        return handleActionError({
            context: "Error creating home visit:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
            },
        });
    }
}

/**
 * Soft delete a home visit and enqueue its photos for durable cleanup
 */
export async function deleteHomeVisit(
    visitId: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const validated = deleteHomeVisitSchema.parse({ visitId });
        const session = await requireAuth();

        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminReadonly("แก้ไขข้อมูล"),
            };
        }

        const visit = await prisma.homeVisit.findUnique({
            where: { id: validated.visitId, deletedAt: null },
            select: { studentId: true },
        });

        if (!visit) {
            return { success: false, message: "ไม่พบข้อมูลที่ต้องการลบ" };
        }

        const { allowed, error } = await verifyStudentAccessForUser({
            studentId: visit.studentId,
            userId: session.user.id,
            userRole: session.user.role,
            mode: "manage",
        });

        if (!allowed) {
            return { success: false, message: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const deleteResult = await softDeleteHomeVisitAndEnqueueFiles({
            visitId: validated.visitId,
            deletedById: session.user.id,
        });

        if (deleteResult === "not-found") {
            return { success: false, message: "ไม่พบข้อมูลที่ต้องการลบ" };
        }
        if (deleteResult === "historical") {
            return {
                success: false,
                message: LATEST_CARE_RECORD_ONLY_MESSAGE,
            };
        }

        revalidatePath(`/students/${visit.studentId}`);

        return { success: true };
    } catch (error) {
        return handleActionError({
            context: "Error deleting home visit:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการลบข้อมูล",
            },
        });
    }
}
