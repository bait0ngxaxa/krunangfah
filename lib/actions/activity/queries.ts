"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

/**
 * Get activity progress for a student
 */
export async function getActivityProgress(
    studentId: string,
    phqResultId: string,
) {
    try {
        await requireAuth();
        const progress = await prisma.activityProgress.findMany({
            where: {
                studentId,
                phqResultId,
            },
            include: {
                worksheetUploads: {
                    orderBy: { uploadedAt: "desc" },
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
