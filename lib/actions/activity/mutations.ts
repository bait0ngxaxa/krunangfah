"use server";

import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { ActivityStatus } from "@prisma/client";
import { ACTIVITY_INDICES } from "./constants";
import type { SubmitAssessmentData, ScheduleActivityData } from "./types";
import { logError } from "@/lib/utils/logging";
import {
    submitAssessmentSchema,
    scheduleActivitySchema,
    updateTeacherNotesSchema,
    updateScheduledDateSchema,
} from "@/lib/validations/activity.validation";

/**
 * Verify user has access to student's activity
 */
async function verifyActivityAccess(
    studentId: string,
    userId: string,
    userRole: string,
): Promise<{ allowed: boolean; error?: string }> {
    // system_admin reads all students, but write operations still gate separately.
    if (userRole === "system_admin") {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true },
        });
        if (!student) {
            return { allowed: false, error: "ไม่พบข้อมูลนักเรียน" };
        }
        return { allowed: true };
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            schoolId: true,
            teacher: { select: { advisoryClass: true } },
        },
    });

    if (!user?.schoolId) {
        return { allowed: false, error: "ไม่พบข้อมูลโรงเรียน" };
    }

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { schoolId: true, class: true },
    });

    if (!student) {
        return { allowed: false, error: "ไม่พบข้อมูลนักเรียน" };
    }

    if (student.schoolId !== user.schoolId) {
        return { allowed: false, error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" };
    }

    if (userRole === "class_teacher") {
        const advisoryClass = user.teacher?.advisoryClass;
        if (!advisoryClass || student.class !== advisoryClass) {
            return {
                allowed: false,
                error: "คุณสามารถเข้าถึงข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น",
            };
        }
    }

    return { allowed: true };
}

/**
 * Initialize activity progress for a student based on their PHQ result
 * Called automatically when a new PHQ result is created
 */
export async function initializeActivityProgress(
    studentId: string,
    phqResultId: string,
    riskLevel: string,
) {
    try {
        // Require authenticated server context even when function is imported client-side.
        await requireAuth();

        const activityNumbers = Object.hasOwn(ACTIVITY_INDICES, riskLevel)
            ? ACTIVITY_INDICES[riskLevel as keyof typeof ACTIVITY_INDICES]
            : [];

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

        await prisma.activityProgress.createMany({
            data: records,
            skipDuplicates: true,
        });

        return { success: true, count: records.length };
    } catch (error) {
        logError("Error initializing activity progress:", error);
        return {
            success: false,
            error: "เกิดข้อผิดพลาดในการสร้างกิจกรรมเริ่มต้น",
        };
    }
}

/**
 * Submit teacher assessment after viewing worksheets
 */
export async function submitTeacherAssessment(
    activityProgressId: string,
    data: SubmitAssessmentData,
) {
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
                error: "system_admin ไม่มีสิทธิ์แก้ไขข้อมูลกิจกรรม",
            };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: validated.activityProgressId },
            select: { studentId: true, status: true },
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
        const { allowed, error } = await verifyActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        // Save assessment fields without mutating completion status.
        await prisma.activityProgress.update({
            where: { id: validated.activityProgressId },
            data: {
                internalProblems: validated.internalProblems,
                externalProblems: validated.externalProblems,
                problemType: validated.problemType,
                assessedAt: new Date(),
            },
        });

        return { success: true };
    } catch (error) {
        logError("Error submitting assessment:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการบันทึก" };
    }
}

/**
 * Unlock next activity when current is completed
 */
export async function unlockNextActivity(
    studentId: string,
    phqResultId: string,
    currentActivityNumber: number,
) {
    try {
        // Ensure this helper runs only in authenticated server context.
        await requireAuth();

        // Unlock nearest next locked step in same PHQ sequence.
        const nextActivity = await prisma.activityProgress.findFirst({
            where: {
                studentId,
                phqResultId,
                activityNumber: { gt: currentActivityNumber },
                status: ActivityStatus.locked,
            },
            orderBy: { activityNumber: "asc" },
        });

        if (nextActivity) {
            await prisma.activityProgress.update({
                where: { id: nextActivity.id },
                data: {
                    status: ActivityStatus.in_progress,
                    unlockedAt: new Date(),
                },
            });
        }
    } catch (error) {
        logError("Error unlocking next activity:", error);
    }
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
                error: "system_admin ไม่มีสิทธิ์แก้ไขข้อมูลกิจกรรม",
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
            return {
                success: true,
                activityNumber: activityProgress.activityNumber,
            };
        }

        // Enforce school/class ownership before completion update.
        const { allowed, error } = await verifyActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        // Mark current step complete.
        await prisma.activityProgress.update({
            where: { id: activityProgressId },
            data: {
                status: ActivityStatus.completed,
                completedAt: new Date(),
            },
        });

        // Advance sequence gate for next activity.
        await unlockNextActivity(
            activityProgress.studentId,
            activityProgress.phqResultId,
            activityProgress.activityNumber,
        );

        revalidateTag("analytics", "default");

        return {
            success: true,
            activityNumber: activityProgress.activityNumber,
        };
    } catch (error) {
        logError("Error confirming activity completion:", error);
        return { success: false, error: "เกิดข้อผิดพลาด" };
    }
}

/**
 * Schedule activity with teacher
 */
export async function scheduleActivity(
    activityProgressId: string,
    data: ScheduleActivityData,
) {
    try {
        // Validate shape and constraints before DB access.
        const validated = scheduleActivitySchema.parse({
            activityProgressId,
            ...data,
        });

        const session = await requireAuth();

        // system_admin is readonly in activity workflow.
        if (session.user.role === "system_admin") {
            return {
                success: false,
                error: "system_admin ไม่มีสิทธิ์แก้ไขข้อมูลกิจกรรม",
            };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: validated.activityProgressId },
            select: { studentId: true },
        });

        if (!activityProgress) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        // Enforce school/class ownership before update.
        const { allowed, error } = await verifyActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const updated = await prisma.activityProgress.update({
            where: { id: validated.activityProgressId },
            data: {
                scheduledDate: validated.scheduledDate,
                teacherId: validated.teacherId,
                teacherNotes: validated.teacherNotes,
            },
        });

        return { success: true, data: updated };
    } catch (error) {
        logError("Error scheduling activity:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการนัดหมาย" };
    }
}

/**
 * Update teacher notes for an activity
 */
export async function updateTeacherNotes(
    activityProgressId: string,
    notes: string,
) {
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
                error: "system_admin ไม่มีสิทธิ์แก้ไขข้อมูลกิจกรรม",
            };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: validated.activityProgressId },
            select: { studentId: true, teacherId: true },
        });

        if (!activityProgress) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        // Enforce school/class ownership before update.
        const { allowed, error } = await verifyActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const updated = await prisma.activityProgress.update({
            where: { id: validated.activityProgressId },
            data: {
                teacherNotes: validated.notes,
                teacherId: activityProgress.teacherId || session.user.id,
            },
        });

        return { success: true, data: updated };
    } catch (error) {
        logError("Error updating teacher notes:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการแก้ไข" };
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
                error: "system_admin ไม่มีสิทธิ์แก้ไขข้อมูลกิจกรรม",
            };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: validated.activityProgressId },
            select: { studentId: true, status: true },
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

        const { allowed, error } = await verifyActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        await prisma.activityProgress.update({
            where: { id: validated.activityProgressId },
            data: {
                scheduledDate: new Date(validated.scheduledDate),
                teacherId: session.user.id,
            },
        });

        revalidateTag("student-detail", "default");

        return { success: true };
    } catch (error) {
        logError("Error updating scheduled date:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกวันนัดหมาย" };
    }
}
