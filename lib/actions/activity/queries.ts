"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logError } from "@/lib/utils/logging";
import { verifyStudentActivityAccess } from "./access";

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
        const { allowed, error } = await verifyStudentActivityAccess(
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
        logError("Error getting activity progress:", error);
        return {
            success: false,
            error: "เกิดข้อผิดพลาดในการดึงข้อมูลความคืบหน้ากิจกรรม",
        };
    }
}
