"use server";

import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActivityStatus } from "@prisma/client";
import { ACTIVITY_INDICES } from "./constants";
import type { SubmitAssessmentData, ScheduleActivityData } from "./types";

/**
 * Verify user has access to student's activity
 */
async function verifyActivityAccess(
    studentId: string,
    userId: string,
    userRole: string,
): Promise<{ allowed: boolean; error?: string }> {
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
        const activityNumbers = ACTIVITY_INDICES[riskLevel] || [];

        if (activityNumbers.length === 0) {
            // No activities for red/blue
            return { success: true, count: 0 };
        }

        // Create activity progress records
        const records = activityNumbers.map((activityNumber, index) => ({
            studentId,
            phqResultId,
            activityNumber,
            status:
                index === 0
                    ? ActivityStatus.in_progress
                    : ActivityStatus.locked, // First activity unlocked
            unlockedAt: index === 0 ? new Date() : null,
        }));

        await prisma.activityProgress.createMany({
            data: records,
            skipDuplicates: true,
        });

        return { success: true, count: records.length };
    } catch (error) {
        console.error("Error initializing activity progress:", error);
        return { success: false, error: "Failed to initialize activities" };
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
        const session = await requireAuth();

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: activityProgressId },
            select: { studentId: true },
        });

        if (!activityProgress) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        // Verify access
        const { allowed, error } = await verifyActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        // Save assessment data (activity is already completed from upload)
        await prisma.activityProgress.update({
            where: { id: activityProgressId },
            data: {
                internalProblems: data.internalProblems,
                externalProblems: data.externalProblems,
                problemType: data.problemType,
                assessedAt: new Date(),
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error submitting assessment:", error);
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
        // Find next locked activity
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
        console.error("Error unlocking next activity:", error);
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
        const session = await requireAuth();

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: activityProgressId },
            select: { studentId: true },
        });

        if (!activityProgress) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        // Verify access
        const { allowed, error } = await verifyActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const updated = await prisma.activityProgress.update({
            where: { id: activityProgressId },
            data: {
                scheduledDate: data.scheduledDate,
                teacherId: data.teacherId,
                teacherNotes: data.teacherNotes,
            },
        });

        return { success: true, data: updated };
    } catch (error) {
        console.error("Error scheduling activity:", error);
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
        const session = await requireAuth();

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: activityProgressId },
            select: { studentId: true, teacherId: true },
        });

        if (!activityProgress) {
            return { success: false, error: "ไม่พบข้อมูลกิจกรรม" };
        }

        // Verify access
        const { allowed, error } = await verifyActivityAccess(
            activityProgress.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const updated = await prisma.activityProgress.update({
            where: { id: activityProgressId },
            data: {
                teacherNotes: notes,
                teacherId: activityProgress.teacherId || session.user.id,
            },
        });

        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating teacher notes:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการแก้ไข" };
    }
}
