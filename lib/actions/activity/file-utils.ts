"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
    REQUIRED_WORKSHEETS,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
} from "./constants";
import { revalidateTag } from "next/cache";
import { validateFileSignature } from "@/lib/utils/file-signature";
import type { UploadWorksheetResult } from "./types";

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

        // system_admin เป็น readonly — ไม่สามารถอัปโหลดใบงานได้
        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: "system_admin ไม่มีสิทธิ์อัปโหลดใบงาน",
            };
        }

        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, message: "No file provided" };
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return { success: false, message: "ไฟล์ใหญ่เกินไป (สูงสุด 10MB)" };
        }

        // Validate file extension (whitelist only)
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

        // Validate file signature (magic number) to prevent extension spoofing
        if (!validateFileSignature(buffer, ext)) {
            return {
                success: false,
                message:
                    "เนื้อหาไฟล์ไม่ตรงกับนามสกุล กรุณาอัปโหลดไฟล์ที่ถูกต้อง",
            };
        }

        // Get activity progress with student info for authorization
        const activityProgress = await prisma.activityProgress.findUnique({
            where: { id: activityProgressId },
            include: {
                student: {
                    select: {
                        id: true,
                        schoolId: true,
                        class: true,
                    },
                },
                worksheetUploads: {
                    select: { id: true, worksheetNumber: true },
                },
            },
        });

        if (!activityProgress) {
            return { success: false, message: "Activity not found" };
        }

        // Verify authorization by role
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                schoolId: true,
                role: true,
            },
        });

        // system_admin / school_admin can access all files (school_admin scoped to own school)
        // class_teacher: schoolId check only — UI already filters by advisory class
        if (user?.role !== "system_admin") {
            if (
                !user?.schoolId ||
                user.schoolId !== activityProgress.student.schoolId
            ) {
                return {
                    success: false,
                    message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
                };
            }
        }

        // Create upload directory if not exists
        // SECURITY: Store outside public/ to prevent unauthenticated access
        // Files are served exclusively through the /api/uploads/ route with auth checks
        const uploadDir = join(process.cwd(), ".data", "uploads", "worksheets");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename using validated extension
        const timestamp = Date.now();
        const fileName = `${activityProgress.studentId}_activity${activityProgress.activityNumber}_${timestamp}.${ext}`;
        const filePath = join(uploadDir, fileName);

        // Save file to disk
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath built from DB UUID + activityNumber + timestamp + whitelist-validated extension
        await writeFile(filePath, buffer);

        // Save to database — clean up file if DB write fails
        const fileUrl = `/api/uploads/worksheets/${fileName}`;
        let upload;
        // Determine worksheet number: fill the first available slot
        const existingNumbers = new Set(
            activityProgress.worksheetUploads.map((u) => u.worksheetNumber),
        );
        let worksheetNumber = 1;
        while (existingNumbers.has(worksheetNumber)) {
            worksheetNumber++;
        }

        try {
            upload = await prisma.worksheetUpload.create({
                data: {
                    activityProgressId,
                    worksheetNumber,
                    fileName: file.name,
                    fileUrl,
                    fileType: file.type,
                    fileSize: file.size,
                    uploadedById: session.user.id,
                },
            });
        } catch (dbError) {
            // Clean up orphaned file if DB insert fails
            const { unlink } = await import("fs/promises");
            await unlink(filePath).catch(() => {});
            throw dbError;
        }

        // Check if all required worksheets are uploaded
        const requiredCount =
            REQUIRED_WORKSHEETS[activityProgress.activityNumber] || 2;
        const currentUploadCount = activityProgress.worksheetUploads.length + 1;
        const allUploaded = currentUploadCount >= requiredCount;

        // Update teacherId if not set
        if (!activityProgress.teacherId) {
            await prisma.activityProgress.update({
                where: { id: activityProgressId },
                data: {
                    teacherId: session.user.id,
                },
            });
        }

        return {
            success: true,
            message: "Worksheet uploaded successfully",
            worksheet: {
                id: upload.id,
                worksheetNumber,
                filePath: fileUrl,
            },
            uploadedCount: currentUploadCount,
            requiredCount,
            allUploaded,
            activityNumber: activityProgress.activityNumber,
        };
    } catch (error) {
        console.error("Error uploading worksheet:", error);
        return { success: false, message: "Failed to upload worksheet" };
    }
}

/**
 * ลบไฟล์ใบงานที่อัปโหลดแล้ว
 */
export async function deleteWorksheetUpload(
    uploadId: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, message: "Unauthorized" };
        }

        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: "system_admin ไม่มีสิทธิ์ลบใบงาน",
            };
        }

        // Find the upload with its related data
        const upload = await prisma.worksheetUpload.findUnique({
            where: { id: uploadId },
            include: {
                activityProgress: {
                    include: {
                        student: { select: { schoolId: true } },
                        worksheetUploads: { select: { id: true } },
                    },
                },
            },
        });

        if (!upload) {
            return { success: false, message: "ไม่พบไฟล์ที่ต้องการลบ" };
        }

        // Verify authorization
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { schoolId: true, role: true },
        });

        if (user?.role !== "system_admin") {
            if (
                !user?.schoolId ||
                user.schoolId !== upload.activityProgress.student.schoolId
            ) {
                return { success: false, message: "ไม่มีสิทธิ์ลบไฟล์นี้" };
            }
        }

        // Delete file from disk
        const fileName = upload.fileUrl.replace("/api/uploads/worksheets/", "");
        const filePath = join(
            process.cwd(),
            ".data",
            "uploads",
            "worksheets",
            fileName,
        );
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath built from DB fileUrl, not user input
        if (existsSync(filePath)) {
            const { unlink } = await import("fs/promises");
            await unlink(filePath).catch(() => {});
        }

        // Delete DB record
        await prisma.worksheetUpload.delete({
            where: { id: uploadId },
        });

        // If activity was completed but now doesn't meet required count, revert status
        const activityProgress = upload.activityProgress;
        const remainingCount = activityProgress.worksheetUploads.length - 1;
        const requiredCount =
            REQUIRED_WORKSHEETS[activityProgress.activityNumber] || 2;

        if (
            activityProgress.status === "completed" &&
            remainingCount < requiredCount
        ) {
            await prisma.activityProgress.update({
                where: { id: activityProgress.id },
                data: {
                    status: "in_progress",
                    completedAt: null,
                },
            });
        }

        revalidateTag("analytics", "default");

        return { success: true, message: "ลบไฟล์สำเร็จ" };
    } catch (error) {
        console.error("Error deleting worksheet:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบไฟล์" };
    }
}
