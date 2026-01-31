"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const ACTIVITY_INDICES: Record<string, number[]> = {
    orange: [1, 2, 3, 4, 5],
    yellow: [1, 2, 3, 5],
    green: [1, 2, 5],
};

// Required number of worksheets per activity
const REQUIRED_WORKSHEETS: Record<number, number> = {
    1: 2,
    2: 2,
    3: 2,
    4: 2,
    5: 1, // Activity 5 has only 1 worksheet
};

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
            status: index === 0 ? "in_progress" : "locked", // First activity unlocked
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
 * Get activity progress for a student
 */
export async function getActivityProgress(
    studentId: string,
    phqResultId: string,
) {
    try {
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

/**
 * Upload worksheet file
 */
export async function uploadWorksheet(
    activityProgressId: string,
    formData: FormData,
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, error: "No file provided" };
        }

        // Validate file type
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "application/pdf",
        ];
        if (!allowedTypes.includes(file.type)) {
            return { success: false, error: "Invalid file type" };
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return { success: false, error: "File too large (max 10MB)" };
        }

        // Get activity progress
        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: activityProgressId },
            include: {
                student: true,
                worksheetUploads: true,
            },
        });

        if (!activityProgress) {
            return { success: false, error: "Activity not found" };
        }

        // Create upload directory if not exists
        const uploadDir = join(
            process.cwd(),
            "public",
            "uploads",
            "worksheets",
        );
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split(".").pop();
        const fileName = `${activityProgress.studentId}_activity${activityProgress.activityNumber}_${timestamp}.${ext}`;
        const filePath = join(uploadDir, fileName);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Save to database - use API route instead of static file
        const fileUrl = `/api/uploads/worksheets/${fileName}`;
        const upload = await prisma.worksheetUpload.create({
            data: {
                activityProgressId,
                fileName: file.name,
                fileUrl,
                fileType: file.type,
                fileSize: file.size,
                uploadedById: session.user.id,
            },
        });

        // Check if activity should be completed
        // Activity is completed when all required worksheets are uploaded
        const requiredCount =
            REQUIRED_WORKSHEETS[activityProgress.activityNumber] || 2;
        const currentUploadCount = activityProgress.worksheetUploads.length + 1; // +1 for the new upload

        const shouldComplete =
            activityProgress.status !== "completed" &&
            currentUploadCount >= requiredCount;

        // Update teacherId if not set
        if (!activityProgress.teacherId) {
            await prisma.activityProgress.update({
                where: { id: activityProgressId },
                data: {
                    teacherId: session.user.id,
                },
            });
        }

        if (shouldComplete) {
            // When all worksheets uploaded, mark as completed immediately
            await prisma.activityProgress.update({
                where: { id: activityProgressId },
                data: {
                    status: "completed",
                    completedAt: new Date(),
                },
            });

            // Unlock next activity
            await unlockNextActivity(
                activityProgress.studentId,
                activityProgress.phqResultId,
                activityProgress.activityNumber,
            );
        }

        return {
            success: true,
            data: upload,
            uploadedCount: currentUploadCount,
            requiredCount,
            completed: shouldComplete,
            activityNumber: activityProgress.activityNumber,
        };
    } catch (error) {
        console.error("Error uploading worksheet:", error);
        return { success: false, error: "Failed to upload worksheet" };
    }
}

/**
 * Submit teacher assessment after viewing worksheets
 */
export async function submitTeacherAssessment(
    activityProgressId: string,
    data: {
        internalProblems: string;
        externalProblems: string;
        problemType: "internal" | "external";
    },
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: activityProgressId },
        });

        if (!activityProgress) {
            return { success: false, error: "Activity not found" };
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
        return { success: false, error: "Failed to submit assessment" };
    }
}

/**
 * Unlock next activity when current is completed
 */
async function unlockNextActivity(
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
                status: "locked",
            },
            orderBy: { activityNumber: "asc" },
        });

        if (nextActivity) {
            await prisma.activityProgress.update({
                where: { id: nextActivity.id },
                data: {
                    status: "in_progress",
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
    data: {
        scheduledDate: Date;
        teacherId: string;
        teacherNotes?: string;
    },
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
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
        return { success: false, error: "Failed to schedule activity" };
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
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: activityProgressId },
        });

        if (!activityProgress) {
            return { success: false, error: "Activity not found" };
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
        return { success: false, error: "Failed to update notes" };
    }
}
