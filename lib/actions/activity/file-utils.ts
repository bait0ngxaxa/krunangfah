"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
    REQUIRED_WORKSHEETS,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE,
} from "./constants";
import { unlockNextActivity } from "./mutations";
import type { UploadWorksheetResult } from "./types";

/**
 * Upload worksheet file
 */
export async function uploadWorksheet(
    activityProgressId: string,
    formData: FormData,
): Promise<UploadWorksheetResult> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, message: "Unauthorized" };
        }

        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, message: "No file provided" };
        }

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return { success: false, message: "Invalid file type" };
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return { success: false, message: "File too large (max 10MB)" };
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
            return { success: false, message: "Activity not found" };
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
            message: "Worksheet uploaded successfully",
            worksheet: {
                id: upload.id,
                worksheetNumber: currentUploadCount,
                filePath: fileUrl,
            },
            uploadedCount: currentUploadCount,
            requiredCount,
            completed: shouldComplete,
            activityNumber: activityProgress.activityNumber,
        };
    } catch (error) {
        console.error("Error uploading worksheet:", error);
        return { success: false, message: "Failed to upload worksheet" };
    }
}
