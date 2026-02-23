"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

/**
 * Verify user has access to student's activity
 */
async function verifyActivityAccess(
    studentId: string,
    userId: string,
    userRole: string,
): Promise<{ allowed: boolean; error?: string }> {
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
 * Get activity progress for a student
 */
export async function getActivityProgress(
    studentId: string,
    phqResultId: string,
) {
    try {
        const session = await requireAuth();

        // Verify user has access to this student
        const { allowed, error } = await verifyActivityAccess(
            studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, error: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const progress = await prisma.activityProgress.findMany({
            where: {
                studentId,
                phqResultId,
            },
            include: {
                worksheetUploads: {
                    orderBy: { worksheetNumber: "asc" },
                },
                teacher: {
                    select: {
                        name: true,
                        email: true,
                        teacher: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
            orderBy: { activityNumber: "asc" },
        });

        return { success: true, data: progress };
    } catch (error) {
        console.error("Error getting activity progress:", error);
        return { success: false, error: "Failed to get activity progress" };
    }
}
