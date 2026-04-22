"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import {
    REQUIRED_WORKSHEETS,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
} from "./constants";
import { validateFileSignature } from "@/lib/utils/file-signature";
import { canAccessStudentByRole } from "@/lib/security/student-access";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import type { UploadWorksheetResult } from "./types";
import { logError } from "@/lib/utils/logging";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import { MAX_IMAGE_UPLOAD_INPUT_SIZE } from "@/lib/constants/image-upload";
import {
    UPLOAD_WORKSHEETS_DIR,
    buildWorksheetFilePath,
    buildWorksheetFileUrl,
    extractWorksheetFileName,
} from "@/lib/constants/uploads";
import {
    compressWorksheetImageBuffer,
    isSupportedWorksheetImageExtension,
} from "@/lib/utils/server-image-compression";

const MAX_WORKSHEET_NUMBER_RETRIES = 3;

class UploadWorksheetError extends Error {
    constructor(
        public readonly code:
            | "UPLOAD_IMAGE_COMPRESSION_FAILED"
            | "UPLOAD_FILE_WRITE_FAILED"
            | "UPLOAD_DB_FAILED"
            | "UPLOAD_POST_PROCESS_FAILED",
        message: string,
        options?: { cause?: unknown },
    ) {
        super(message);
        this.name = "UploadWorksheetError";
        if (options?.cause !== undefined) {
            this.cause = options.cause;
        }
    }
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
            return {
                success: false,
                message: "ไม่อนุญาตให้เข้าถึง",
                error: "UPLOAD_UNAUTHORIZED",
            };
        }

        // system_admin เป็น readonly — ไม่สามารถอัปโหลดใบงานได้
        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminUploadWorksheet,
                error: "UPLOAD_ACCESS_DENIED",
            };
        }

        const file = formData.get("file") as File;
        if (!file) {
            return {
                success: false,
                message: "ไม่พบไฟล์ใบงาน",
                error: "UPLOAD_FILE_MISSING",
            };
        }
        if (file.size > MAX_IMAGE_UPLOAD_INPUT_SIZE) {
            return {
                success: false,
                message: "ไฟล์ต้นฉบับใหญ่เกินไป (สูงสุด 8MB)",
                error: "UPLOAD_FILE_TOO_LARGE",
            };
        }

        // Validate file extension (whitelist only)
        const ext = getValidExtension(file.name);
        if (!ext) {
            return {
                success: false,
                message:
                    "นามสกุลไฟล์ไม่ถูกต้อง (รองรับ .jpg, .jpeg, .png เท่านั้น)",
                error: "UPLOAD_INVALID_EXTENSION",
            };
        }

        // Read file content
        const bytes = await file.arrayBuffer();
        let buffer: Buffer<ArrayBufferLike> = Buffer.from(bytes);
        let outputExt = ext;
        let outputFileType = file.type;

        // Validate file signature (magic number) to prevent extension spoofing
        if (!validateFileSignature(buffer, ext)) {
            return {
                success: false,
                message:
                    "เนื้อหาไฟล์ไม่ตรงกับนามสกุล กรุณาอัปโหลดไฟล์ที่ถูกต้อง",
                error: "UPLOAD_SIGNATURE_MISMATCH",
            };
        }

        // Enforce server-side compression for worksheet images.
        // If compression fails, reject to keep storage quality policy deterministic.
        if (!isSupportedWorksheetImageExtension(ext)) {
            return {
                success: false,
                message: "นามสกุลไฟล์รูปภาพไม่ถูกต้อง",
                error: "UPLOAD_INVALID_EXTENSION",
            };
        }
        try {
            const compressed = await compressWorksheetImageBuffer(buffer, ext);
            buffer = compressed.buffer;
            outputExt = compressed.extension;
            outputFileType = compressed.mimeType;
        } catch (error) {
            throw new UploadWorksheetError(
                "UPLOAD_IMAGE_COMPRESSION_FAILED",
                "ไม่สามารถบีบอัดรูปภาพได้ กรุณาเลือกรูปอื่นแล้วลองใหม่",
                { cause: error },
            );
        }

        // Validate compressed output size
        if (buffer.length > MAX_FILE_SIZE) {
            return {
                success: false,
                message: "ไฟล์ใหญ่เกินไปหลังบีบอัด (สูงสุด 5MB)",
                error: "UPLOAD_FILE_TOO_LARGE",
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
            return {
                success: false,
                message: "ไม่พบข้อมูลกิจกรรม",
                error: "UPLOAD_ACTIVITY_NOT_FOUND",
            };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                schoolId: true,
                role: true,
                teacher: { select: { advisoryClass: true } },
            },
        });

        if (!user) {
            return {
                success: false,
                message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
                error: "UPLOAD_ACCESS_DENIED",
            };
        }

        const canAccess = canAccessStudentByRole(
            {
                role: user.role,
                schoolId: user.schoolId,
                advisoryClass: user.teacher?.advisoryClass,
            },
            {
                schoolId: activityProgress.student.schoolId,
                className: activityProgress.student.class,
            },
        );

        if (!canAccess) {
            return {
                success: false,
                message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
                error: "UPLOAD_ACCESS_DENIED",
            };
        }

        // Create upload directory if not exists
        // SECURITY: Store outside public/ to prevent unauthenticated access
        // Files are served exclusively through the /api/uploads/ route with auth checks
        const uploadDir = UPLOAD_WORKSHEETS_DIR;
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- uploadDir is a fixed trusted constant path
        if (!existsSync(uploadDir)) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename -- uploadDir is a fixed trusted constant path
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename using validated extension
        const timestamp = Date.now();
        const fileName = `${activityProgress.studentId}_activity${activityProgress.activityNumber}_${timestamp}.${outputExt}`;
        const filePath = buildWorksheetFilePath(fileName);

        // Save file to disk
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath built from DB UUID + activityNumber + timestamp + whitelist-validated extension
            await writeFile(filePath, buffer);
        } catch (error) {
            throw new UploadWorksheetError(
                "UPLOAD_FILE_WRITE_FAILED",
                "ไม่สามารถบันทึกไฟล์ได้ กรุณาลองใหม่อีกครั้ง",
                { cause: error },
            );
        }

        // Save to database — clean up file if DB write fails
        const fileUrl = buildWorksheetFileUrl(fileName);
        let upload:
            | {
                  id: string;
              }
            | undefined;
        let worksheetNumber = 1;

        try {
            for (let attempt = 0; attempt < MAX_WORKSHEET_NUMBER_RETRIES; attempt++) {
                const existingNumbers = new Set(
                    (
                        await prisma.worksheetUpload.findMany({
                            where: { activityProgressId },
                            select: { worksheetNumber: true },
                        })
                    ).map((item) => item.worksheetNumber),
                );

                worksheetNumber = 1;
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
                            fileType: outputFileType,
                            fileSize: buffer.length,
                            uploadedById: session.user.id,
                        },
                        select: { id: true },
                    });
                    break;
                } catch (createError) {
                    if (
                        createError instanceof Prisma.PrismaClientKnownRequestError &&
                        createError.code === "P2002" &&
                        attempt < MAX_WORKSHEET_NUMBER_RETRIES - 1
                    ) {
                        continue;
                    }
                    throw createError;
                }
            }

            if (!upload) {
                throw new Error("ไม่สามารถกำหนดหมายเลขใบงานได้");
            }
        } catch (dbError) {
            // Clean up orphaned file if DB insert fails
            const { unlink } = await import("fs/promises");
            await unlink(filePath).catch(() => {});
            throw new UploadWorksheetError(
                "UPLOAD_DB_FAILED",
                "ไม่สามารถบันทึกข้อมูลไฟล์ได้ กรุณาลองใหม่อีกครั้ง",
                { cause: dbError },
            );
        }

        // Check if all required worksheets are uploaded
        const requiredCount =
            REQUIRED_WORKSHEETS[activityProgress.activityNumber] || 2;
        let currentUploadCount = 0;
        let allUploaded = false;
        try {
            currentUploadCount = await prisma.worksheetUpload.count({
                where: { activityProgressId },
            });
            allUploaded = currentUploadCount >= requiredCount;

            // Update teacherId if not set
            if (!activityProgress.teacherId) {
                await prisma.activityProgress.update({
                    where: { id: activityProgressId },
                    data: {
                        teacherId: session.user.id,
                    },
                });
            }
        } catch (error) {
            throw new UploadWorksheetError(
                "UPLOAD_POST_PROCESS_FAILED",
                "อัปโหลดไฟล์สำเร็จ แต่ไม่สามารถอัปเดตสถานะได้ กรุณารีเฟรชหน้า",
                { cause: error },
            );
        }

        return {
            success: true,
            message: "อัปโหลดใบงานสำเร็จ",
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
        logError("Error uploading worksheet:", error);
        if (error instanceof UploadWorksheetError) {
            return {
                success: false,
                message: error.message,
                error: error.code,
            };
        }

        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการอัปโหลดใบงาน",
            error: "UPLOAD_UNKNOWN_ERROR",
        };
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
            return { success: false, message: "ไม่อนุญาตให้เข้าถึง" };
        }

        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminDeleteWorksheet,
            };
        }

        // Find the upload with its related data
        const upload = await prisma.worksheetUpload.findUnique({
            where: { id: uploadId },
            include: {
                activityProgress: {
                    include: {
                        student: { select: { schoolId: true, class: true } },
                        worksheetUploads: { select: { id: true } },
                    },
                },
            },
        });

        if (!upload) {
            return { success: false, message: "ไม่พบไฟล์ที่ต้องการลบ" };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                schoolId: true,
                role: true,
                teacher: { select: { advisoryClass: true } },
            },
        });

        if (!user) {
            return { success: false, message: "ไม่มีสิทธิ์ลบไฟล์นี้" };
        }

        const canAccess = canAccessStudentByRole(
            {
                role: user.role,
                schoolId: user.schoolId,
                advisoryClass: user.teacher?.advisoryClass,
            },
            {
                schoolId: upload.activityProgress.student.schoolId,
                className: upload.activityProgress.student.class,
            },
        );

        if (!canAccess) {
            return { success: false, message: "ไม่มีสิทธิ์ลบไฟล์นี้" };
        }

        // Delete file from disk
        const fileName = extractWorksheetFileName(upload.fileUrl);
        if (!fileName) {
            return { success: false, message: "ไม่พบไฟล์ที่ต้องการลบ" };
        }

        const filePath = buildWorksheetFilePath(fileName);
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

        revalidateAnalyticsCache(upload.activityProgress.student.schoolId);

        return { success: true, message: "ลบไฟล์สำเร็จ" };
    } catch (error) {
        logError("Error deleting worksheet:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบไฟล์" };
    }
}
