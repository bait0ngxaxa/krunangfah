"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
    REQUIRED_WORKSHEETS,
    ALLOWED_FILE_TYPES,
    ALLOWED_EXTENSIONS,
    MAGIC_BYTES,
    MAX_FILE_SIZE,
} from "./constants";
import { unlockNextActivity } from "./mutations";
import type { UploadWorksheetResult } from "./types";

/**
 * Validate file content by checking magic bytes (file signature)
 * Prevents uploading disguised files (e.g. .exe renamed to .jpg)
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    const signature = MAGIC_BYTES.find((m) => m.mime === mimeType);
    if (!signature) {
        return false;
    }

    if (buffer.length < signature.bytes.length) {
        return false;
    }

    return signature.bytes.every((byte, i) => buffer[i] === byte);
}

function getValidExtension(fileName: string): string | null {
    const parts = fileName.split(".");
    if (parts.length < 2) {
        return null;
    }

    const ext = parts.pop()?.toLowerCase() ?? "";
    return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
}

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

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return { success: false, message: "ไฟล์ใหญ่เกินไป (สูงสุด 10MB)" };
        }

        // Validate MIME type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return {
                success: false,
                message: "ประเภทไฟล์ไม่ถูกต้อง (รองรับ JPG, PNG, PDF เท่านั้น)",
            };
        }

        // Validate file extension
        const ext = getValidExtension(file.name);
        if (!ext) {
            return {
                success: false,
                message:
                    "นามสกุลไฟล์ไม่ถูกต้อง (รองรับ .jpg, .jpeg, .png, .pdf เท่านั้น)",
            };
        }

        // Read file content
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Validate magic bytes (actual file content)
        if (!validateMagicBytes(buffer, file.type)) {
            return {
                success: false,
                message: "เนื้อหาไฟล์ไม่ตรงกับประเภทที่ระบุ",
            };
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

        // Generate unique filename using validated extension
        const timestamp = Date.now();
        const fileName = `${activityProgress.studentId}_activity${activityProgress.activityNumber}_${timestamp}.${ext}`;
        const filePath = join(uploadDir, fileName);

        // Save file
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
        const requiredCount =
            REQUIRED_WORKSHEETS[activityProgress.activityNumber] || 2;
        const currentUploadCount = activityProgress.worksheetUploads.length + 1;

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
