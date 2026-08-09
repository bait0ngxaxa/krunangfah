"use server";

import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { ActivityStatus } from "@prisma/client";
import type { ActivityProgress, Prisma } from "@prisma/client";
import {
    getActivityIndices,
    getRequiredWorksheetCount,
} from "./constants";
import type { SubmitAssessmentData } from "./types";
import { handleActionError } from "@/lib/actions/error-handler";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import {
    submitAssessmentSchema,
    updateTeacherNotesSchema,
    updateScheduledDateSchema,
} from "@/lib/validations/activity.validation";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";
import { LATEST_PHQ_ORDER_BY } from "@/lib/utils/phq-result-selection";
import { canMutatePhqContext } from "@/lib/actions/care-record-current-policy";
import { verifyStudentActivityAccess } from "./access";

async function verifyLatestActivityPhqResult(
    studentId: string,
    phqResultId: string,
): Promise<{ allowed: boolean; error?: string }> {
    const latestPhqResult = await prisma.phqResult.findFirst({
        where: { studentId },
        orderBy: LATEST_PHQ_ORDER_BY,
        select: { id: true },
    });

    if (!latestPhqResult) {
        return { allowed: false, error: "ไม่พบผลคัดกรองล่าสุดของนักเรียน" };
    }

    if (latestPhqResult.id !== phqResultId) {
        return {
            allowed: false,
            error: ERROR_MESSAGES.activity.latestOnly,
        };
    }

    return { allowed: true };
}

function getCompletionScheduleDate(
    scheduledDate: Date | null,
    worksheetUploads: { uploadedAt: Date }[],
): Date | null {
    return scheduledDate ?? worksheetUploads[0]?.uploadedAt ?? null;
}

function getMissingWorksheetError(
    requiredCount: number,
    action: string,
): string {
    return `ต้องอัปโหลดใบงานให้ครบ ${requiredCount} ไฟล์ก่อน${action}`;
}

async function unlockNextActivity(
    tx: Prisma.TransactionClient,
    studentId: string,
    phqResultId: string,
    currentActivityNumber: number,
) {
    // Unlock nearest next locked step in same PHQ sequence.
    const nextActivity = await tx.activityProgress.findFirst({
        where: {
            studentId,
            phqResultId,
            activityNumber: { gt: currentActivityNumber },
            status: ActivityStatus.locked,
        },
        orderBy: { activityNumber: "asc" },
    });

    if (nextActivity) {
        await tx.activityProgress.updateMany({
            where: {
                id: nextActivity.id,
                status: ActivityStatus.locked,
            },
            data: {
                status: ActivityStatus.in_progress,
                unlockedAt: new Date(),
            },
        });
    }
}

async function saveTeacherAssessment(
    activityProgressId: string,
    data: SubmitAssessmentData,
): Promise<{ success: boolean; error?: string }> {
    return runSerializableTransaction(async (tx) => {
        const currentActivity = await tx.activityProgress.findUnique({
            where: { id: activityProgressId },
            select: {
                id: true,
                status: true,
                scheduledDate: true,
                studentId: true,
                phqResultId: true,
                activityNumber: true,
                worksheetUploads: {
                    orderBy: { uploadedAt: "desc" },
                    take: 1,
                    select: { uploadedAt: true },
                },
            },
        });

        if (!currentActivity) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        if (
            currentActivity.status !== ActivityStatus.pending_assessment &&
            currentActivity.status !== ActivityStatus.completed
        ) {
            return {
                success: false,
                error: "ไม่สามารถบันทึกแบบประเมินได้ในสถานะปัจจุบัน",
            };
        }

        if (
            currentActivity.activityNumber !== 1 ||
            currentActivity.status !== ActivityStatus.pending_assessment
        ) {
            const remainsCurrent = await canMutatePhqContext(
                currentActivity.studentId,
                currentActivity.phqResultId,
                tx,
            );
            if (!remainsCurrent) {
                return {
                    success: false,
                    error: ERROR_MESSAGES.activity.latestOnly,
                };
            }

            await tx.activityProgress.update({
                where: { id: currentActivity.id },
                data: {
                    internalProblems: data.internalProblems,
                    externalProblems: data.externalProblems,
                    problemType: data.problemType,
                    assessedAt: new Date(),
                },
            });
            return { success: true };
        }

        const requiredCount = getRequiredWorksheetCount(
            currentActivity.activityNumber,
        );
        const worksheetCount = await tx.worksheetUpload.count({
            where: { activityProgressId: currentActivity.id },
        });
        if (worksheetCount < requiredCount) {
            return {
                success: false,
                error: getMissingWorksheetError(
                    requiredCount,
                    "บันทึกแบบประเมิน",
                ),
            };
        }

        const remainsCurrent = await canMutatePhqContext(
            currentActivity.studentId,
            currentActivity.phqResultId,
            tx,
        );
        if (!remainsCurrent) {
            return {
                success: false,
                error: ERROR_MESSAGES.activity.latestOnly,
            };
        }

        await tx.activityProgress.update({
            where: { id: currentActivity.id },
            data: {
                internalProblems: data.internalProblems,
                externalProblems: data.externalProblems,
                problemType: data.problemType,
                assessedAt: new Date(),
                status: ActivityStatus.completed,
                completedAt: new Date(),
                scheduledDate: getCompletionScheduleDate(
                    currentActivity.scheduledDate,
                    currentActivity.worksheetUploads,
                ),
            },
        });

        await unlockNextActivity(
            tx,
            currentActivity.studentId,
            currentActivity.phqResultId,
            currentActivity.activityNumber,
        );

        return { success: true };
    });
}

/**
 * Initialize activity progress for a student based on their PHQ result
 * Called automatically when a new PHQ result is created
 */
export async function initializeActivityProgress(
    studentId: string,
    phqResultId: string,
    riskLevel: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        // Require authenticated server context even when function is imported client-side.
        const session = await requireAuth();

        if (session.user.role === "system_admin") {
            return {
                success: false,
                error: ERROR_MESSAGES.role.systemAdminReadonlyActivity,
            };
        }

        const { allowed, error } = await verifyStudentActivityAccess(
            studentId,
            session.user.id,
            session.user.role,
            "manage",
        );
        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const latestCheck = await verifyLatestActivityPhqResult(
            studentId,
            phqResultId,
        );
        if (!latestCheck.allowed) {
            return { success: false, error: latestCheck.error };
        }

        const activityNumbers = getActivityIndices(riskLevel);

        if (activityNumbers.length === 0) {
            // Red/blue risk groups do not use worksheet activity flow.
            return { success: true, count: 0 };
        }

        // Create full sequence once; first step unlocked, remaining steps locked.
        const records = activityNumbers.map((activityNumber, index) => ({
            studentId,
            phqResultId,
            activityNumber,
            status:
                index === 0
                    ? ActivityStatus.in_progress
                    : ActivityStatus.locked, // Only first activity is immediately actionable
            unlockedAt: index === 0 ? new Date() : null,
        }));

        const initialized = await runSerializableTransaction(async (tx) => {
            const remainsCurrent = await canMutatePhqContext(
                studentId,
                phqResultId,
                tx,
            );
            if (!remainsCurrent) return false;

            await tx.activityProgress.createMany({
                data: records,
                skipDuplicates: true,
            });
            return true;
        });
        if (!initialized) {
            return {
                success: false,
                error: ERROR_MESSAGES.activity.latestOnly,
            };
        }

        return { success: true, count: records.length };
    } catch (error) {
        return handleActionError({
            context: "Error initializing activity progress:",
            error,
            fallback: {
                success: false,
                error: "เกิดข้อผิดพลาดในการสร้างกิจกรรมเริ่มต้น",
            },
        });
    }
}

/**
 * Submit teacher assessment after viewing worksheets
 */
export async function submitTeacherAssessment(
    activityProgressId: string,
    data: SubmitAssessmentData,
): Promise<{ success: boolean; error?: string }> {
    try {
        // Validate shape and field constraints before touching DB.
        const validated = submitAssessmentSchema.parse({
            activityProgressId,
            ...data,
        });

        const session = await requireAuth();

        // system_admin is readonly in activity workflow.
        if (session.user.role === "system_admin") {
            return {
                success: false,
                error: ERROR_MESSAGES.role.systemAdminReadonlyActivity,
            };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: validated.activityProgressId },
            select: {
                studentId: true,
                status: true,
                phqResultId: true,
                activityNumber: true,
            },
        });

        if (!activityProgress) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        // Assessment is valid after uploads are submitted (pending_assessment/completed).
        if (
            activityProgress.status !== "pending_assessment" &&
            activityProgress.status !== "completed"
        ) {
            return {
                success: false,
                error: "ไม่สามารถบันทึกแบบประเมินได้ในสถานะปัจจุบัน",
            };
        }

        // Enforce school/class ownership before update.
        const { allowed, error } = await verifyStudentActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
            "manage",
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const latestCheck = await verifyLatestActivityPhqResult(
            activityProgress.studentId,
            activityProgress.phqResultId,
        );
        if (!latestCheck.allowed) {
            return { success: false, error: latestCheck.error };
        }

        return saveTeacherAssessment(
            validated.activityProgressId,
            validated,
        );
    } catch (error) {
        return handleActionError({
            context: "Error submitting assessment:",
            error,
            fallback: {
                success: false,
                error: "เกิดข้อผิดพลาดในการบันทึก",
            },
        });
    }
}

async function markPendingTeacherAssessment(
    tx: Prisma.TransactionClient,
    activity: {
        id: string;
        scheduledDate: Date | null;
        worksheetUploads: { uploadedAt: Date }[];
    },
): Promise<void> {
    await tx.activityProgress.update({
        where: { id: activity.id },
        data: {
            status: ActivityStatus.pending_assessment,
            completedAt: null,
            scheduledDate: getCompletionScheduleDate(
                activity.scheduledDate,
                activity.worksheetUploads,
            ),
        },
    });
}

async function completeActivityAndUnlockNext(
    tx: Prisma.TransactionClient,
    activity: {
        id: string;
        scheduledDate: Date | null;
        studentId: string;
        phqResultId: string;
        activityNumber: number;
        worksheetUploads: { uploadedAt: Date }[];
    },
): Promise<void> {
    await tx.activityProgress.update({
        where: { id: activity.id },
        data: {
            status: ActivityStatus.completed,
            completedAt: new Date(),
            scheduledDate: getCompletionScheduleDate(
                activity.scheduledDate,
                activity.worksheetUploads,
            ),
        },
    });

    await unlockNextActivity(
        tx,
        activity.studentId,
        activity.phqResultId,
        activity.activityNumber,
    );
}

/**
 * Confirm activity completion — marks activity as completed and unlocks next
 * Called explicitly when user reviews uploaded worksheets and confirms
 */
export async function confirmActivityComplete(
    activityProgressId: string,
): Promise<{ success: boolean; activityNumber?: number; error?: string }> {
    try {
        const session = await requireAuth();

        if (session.user.role === "system_admin") {
            return {
                success: false,
                error: ERROR_MESSAGES.role.systemAdminReadonlyActivity,
            };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: activityProgressId },
            include: {
                student: { select: { schoolId: true, class: true } },
            },
        });

        if (!activityProgress) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        if (activityProgress.status === "completed") {
            await revalidateAnalyticsCache(activityProgress.student.schoolId);
            return {
                success: true,
                activityNumber: activityProgress.activityNumber,
            };
        }

        // Enforce school/class ownership before completion update.
        const { allowed, error } = await verifyStudentActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
            "manage",
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const latestCheck = await verifyLatestActivityPhqResult(
            activityProgress.studentId,
            activityProgress.phqResultId,
        );
        if (!latestCheck.allowed) {
            return { success: false, error: latestCheck.error };
        }

        const result = await runSerializableTransaction(async (tx) => {
            const currentActivity = await tx.activityProgress.findUnique({
                where: { id: activityProgressId },
                select: {
                    id: true,
                    status: true,
                    scheduledDate: true,
                    studentId: true,
                    phqResultId: true,
                    activityNumber: true,
                    assessedAt: true,
                    worksheetUploads: {
                        orderBy: { uploadedAt: "desc" },
                        take: 1,
                        select: { uploadedAt: true },
                    },
                },
            });

            if (!currentActivity) {
                return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
            }

            if (currentActivity.status === ActivityStatus.completed) {
                return {
                    success: true,
                    activityNumber: currentActivity.activityNumber,
                };
            }

            const requiredCount = getRequiredWorksheetCount(
                currentActivity.activityNumber,
            );
            const worksheetCount = await tx.worksheetUpload.count({
                where: { activityProgressId: currentActivity.id },
            });
            if (worksheetCount < requiredCount) {
                return {
                    success: false,
                    error: getMissingWorksheetError(
                        requiredCount,
                        "ยืนยันจบกิจกรรม",
                    ),
                };
            }

            const remainsCurrent = await canMutatePhqContext(
                currentActivity.studentId,
                currentActivity.phqResultId,
                tx,
            );
            if (!remainsCurrent) {
                return {
                    success: false,
                    error: ERROR_MESSAGES.activity.latestOnly,
                };
            }

            if (
                currentActivity.activityNumber === 1 &&
                !currentActivity.assessedAt
            ) {
                await markPendingTeacherAssessment(tx, currentActivity);
                return {
                    success: true,
                    activityNumber: currentActivity.activityNumber,
                };
            }

            await completeActivityAndUnlockNext(tx, currentActivity);

            return {
                success: true,
                activityNumber: currentActivity.activityNumber,
            };
        });

        if (result.success) {
            await revalidateAnalyticsCache(activityProgress.student.schoolId);
        }

        return result;
    } catch (error) {
        return handleActionError({
            context: "Error confirming activity completion:",
            error,
            fallback: { success: false, error: "เกิดข้อผิดพลาด" },
        });
    }
}

/**
 * Update teacher notes for an activity
 */
export async function updateTeacherNotes(
    activityProgressId: string,
    notes: string,
): Promise<{ success: boolean; data?: ActivityProgress; error?: string }> {
    try {
        // Validate shape and constraints before DB access.
        const validated = updateTeacherNotesSchema.parse({
            activityProgressId,
            notes,
        });

        const session = await requireAuth();

        // system_admin is readonly in activity workflow.
        if (session.user.role === "system_admin") {
            return {
                success: false,
                error: ERROR_MESSAGES.role.systemAdminReadonlyActivity,
            };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: validated.activityProgressId },
            select: { studentId: true, teacherId: true, phqResultId: true },
        });

        if (!activityProgress) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        // Enforce school/class ownership before update.
        const { allowed, error } = await verifyStudentActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
            "manage",
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const latestCheck = await verifyLatestActivityPhqResult(
            activityProgress.studentId,
            activityProgress.phqResultId,
        );
        if (!latestCheck.allowed) {
            return { success: false, error: latestCheck.error };
        }

        const result = await runSerializableTransaction(async (tx) => {
            const currentActivity = await tx.activityProgress.findUnique({
                where: { id: validated.activityProgressId },
                select: { studentId: true, teacherId: true, phqResultId: true },
            });
            if (!currentActivity) {
                return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
            }

            const remainsCurrent = await canMutatePhqContext(
                currentActivity.studentId,
                currentActivity.phqResultId,
                tx,
            );
            if (!remainsCurrent) {
                return {
                    success: false,
                    error: ERROR_MESSAGES.activity.latestOnly,
                };
            }

            const updated = await tx.activityProgress.update({
                where: { id: validated.activityProgressId },
                data: {
                    teacherNotes: validated.notes,
                    teacherId: currentActivity.teacherId || session.user.id,
                },
            });

            return { success: true, data: updated };
        });

        return result;
    } catch (error) {
        return handleActionError({
            context: "Error updating teacher notes:",
            error,
            fallback: {
                success: false,
                error: "เกิดข้อผิดพลาดในการแก้ไข",
            },
        });
    }
}

/**
 * Update activity scheduled date without requiring teacher notes payload.
 */
export async function updateScheduledDate(
    activityProgressId: string,
    scheduledDate: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const validated = updateScheduledDateSchema.parse({
            activityProgressId,
            scheduledDate,
        });

        const session = await requireAuth();

        // system_admin is readonly in activity workflow.
        if (session.user.role === "system_admin") {
            return {
                success: false,
                error: ERROR_MESSAGES.role.systemAdminReadonlyActivity,
            };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: validated.activityProgressId },
            select: { studentId: true, status: true, phqResultId: true },
        });

        if (!activityProgress) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        if (activityProgress.status === "locked") {
            return {
                success: false,
                error: "ไม่สามารถนัดหมายกิจกรรมที่ยังล็อคอยู่",
            };
        }

        if (activityProgress.status === "completed") {
            return {
                success: false,
                error: "ไม่สามารถแก้ไขวันนัดหมายของกิจกรรมที่จบแล้ว",
            };
        }

        const { allowed, error } = await verifyStudentActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
            "manage",
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const latestCheck = await verifyLatestActivityPhqResult(
            activityProgress.studentId,
            activityProgress.phqResultId,
        );
        if (!latestCheck.allowed) {
            return { success: false, error: latestCheck.error };
        }

        const result = await runSerializableTransaction(async (tx) => {
            const currentActivity = await tx.activityProgress.findUnique({
                where: { id: validated.activityProgressId },
                select: { studentId: true, status: true, phqResultId: true },
            });
            if (!currentActivity) {
                return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
            }
            if (currentActivity.status === ActivityStatus.locked) {
                return {
                    success: false,
                    error: "ไม่สามารถนัดหมายกิจกรรมที่ยังล็อคอยู่",
                };
            }
            if (currentActivity.status === ActivityStatus.completed) {
                return {
                    success: false,
                    error: "ไม่สามารถแก้ไขวันนัดหมายของกิจกรรมที่จบแล้ว",
                };
            }

            const remainsCurrent = await canMutatePhqContext(
                currentActivity.studentId,
                currentActivity.phqResultId,
                tx,
            );
            if (!remainsCurrent) {
                return {
                    success: false,
                    error: ERROR_MESSAGES.activity.latestOnly,
                };
            }

            await tx.activityProgress.update({
                where: { id: validated.activityProgressId },
                data: {
                    scheduledDate: new Date(validated.scheduledDate),
                },
            });
            return { success: true };
        });

        if (result.success) {
            revalidateStudentsCache(undefined, activityProgress.studentId);
        }

        return result;
    } catch (error) {
        return handleActionError({
            context: "Error updating scheduled date:",
            error,
            fallback: {
                success: false,
                error: "เกิดข้อผิดพลาดในการบันทึกวันนัดหมาย",
            },
        });
    }
}
