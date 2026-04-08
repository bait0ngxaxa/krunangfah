/**
 * Server Actions for Home Visit Photo uploads
 * อัปโหลดและลบรูปภาพการเยี่ยมบ้าน
 *
 * Reuses existing patterns from file-utils.ts:
 * - File signature (magic bytes) validation
 * - Secure storage in .data/uploads/ (not public/)
 * - Authenticated serving via /api/uploads/ route
 */

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { validateFileSignature } from "@/lib/utils/file-signature";
import { canAccessStudentByRole } from "@/lib/security/student-access";
import { revalidatePath } from "next/cache";
import { logError } from "@/lib/utils/logging";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import { MAX_IMAGE_UPLOAD_SIZE } from "@/lib/constants/image-upload";
import {
    compressWorksheetImageBuffer,
    isSupportedWorksheetImageExtension,
} from "@/lib/utils/server-image-compression";

/** Allowed image extensions for home visit photos */
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

/** Maximum file size after compression: 5MB */
const MAX_FILE_SIZE = MAX_IMAGE_UPLOAD_SIZE;

/** Maximum photos per home visit */
const MAX_PHOTOS_PER_VISIT = 5;

function getValidExtension(fileName: string): string | null {
    const parts = fileName.split(".");
    if (parts.length < 2) {
        return null;
    }

    const ext = parts.pop()?.toLowerCase() ?? "";
    return ALLOWED_IMAGE_EXTENSIONS.has(ext) ? ext : null;
}

/**
 * Upload a photo for a home visit
 */
export async function uploadHomeVisitPhoto(
    homeVisitId: string,
    formData: FormData,
): Promise<{
    success: boolean;
    message: string;
    photo?: { id: string; fileUrl: string; fileName: string };
}> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, message: "ไม่อนุญาตให้เข้าถึง" };
        }

        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminReadonly("อัปโหลดรูปภาพ"),
            };
        }

        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, message: "ไม่พบไฟล์" };
        }

        // Validate file extension (images only)
        const ext = getValidExtension(file.name);
        if (!ext) {
            return {
                success: false,
                message: "รองรับไฟล์รูปภาพ .jpg, .jpeg, .png เท่านั้น",
            };
        }

        // Read file content
        const bytes = await file.arrayBuffer();
        let buffer: Buffer<ArrayBufferLike> = Buffer.from(bytes);
        let outputExt = ext;
        let outputMimeType = file.type;

        // Validate file signature (magic number)
        if (!validateFileSignature(buffer, ext)) {
            return {
                success: false,
                message:
                    "เนื้อหาไฟล์ไม่ตรงกับนามสกุล กรุณาอัปโหลดไฟล์ที่ถูกต้อง",
            };
        }

        if (!isSupportedWorksheetImageExtension(ext)) {
            return {
                success: false,
                message: "นามสกุลไฟล์รูปภาพไม่ถูกต้อง",
            };
        }

        try {
            const compressed = await compressWorksheetImageBuffer(buffer, ext);
            buffer = compressed.buffer;
            outputExt = compressed.extension;
            outputMimeType = compressed.mimeType;
        } catch (error) {
            logError("Home visit image compression failed:", error);
            return {
                success: false,
                message: "ไม่สามารถบีบอัดรูปภาพได้ กรุณาเลือกรูปอื่นแล้วลองใหม่",
            };
        }

        if (buffer.length > MAX_FILE_SIZE) {
            return {
                success: false,
                message: "ไฟล์ใหญ่เกินไปหลังบีบอัด (สูงสุด 5MB)",
            };
        }

        // Get home visit with student info for authorization
        const homeVisit = await prisma.homeVisit.findUnique({
            where: { id: homeVisitId },
            select: {
                id: true,
                studentId: true,
                student: { select: { schoolId: true, class: true } },
                photos: { select: { id: true } },
            },
        });

        if (!homeVisit) {
            return { success: false, message: "ไม่พบข้อมูลการเยี่ยมบ้าน" };
        }

        // Check max photos limit
        if (homeVisit.photos.length >= MAX_PHOTOS_PER_VISIT) {
            return {
                success: false,
                message: `อัปโหลดรูปภาพได้สูงสุด ${MAX_PHOTOS_PER_VISIT} รูปต่อครั้ง`,
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
            };
        }

        const canAccess = canAccessStudentByRole(
            {
                role: user.role,
                schoolId: user.schoolId,
                advisoryClass: user.teacher?.advisoryClass,
            },
            {
                schoolId: homeVisit.student.schoolId,
                className: homeVisit.student.class,
            },
        );

        if (!canAccess) {
            return {
                success: false,
                message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
            };
        }

        // Create upload directory
        const uploadDir = join(
            process.cwd(),
            ".data",
            "uploads",
            "home-visits",
        );
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${homeVisit.studentId}_visit_${timestamp}.${outputExt}`;
        const filePath = join(uploadDir, fileName);

        // Save file to disk
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath built from DB UUID + timestamp + whitelist-validated extension
        await writeFile(filePath, buffer);

        // Save to database
        const fileUrl = `/api/uploads/home-visits/${fileName}`;
        let photo;

        try {
            photo = await prisma.homeVisitPhoto.create({
                data: {
                    homeVisitId,
                    fileName: file.name,
                    fileUrl,
                    fileType: outputMimeType,
                    fileSize: buffer.length,
                },
            });
        } catch (dbError) {
            // Clean up orphaned file if DB insert fails
            const { unlink } = await import("fs/promises");
            await unlink(filePath).catch(() => {});
            throw dbError;
        }

        revalidatePath(`/students/${homeVisit.studentId}`);

        return {
            success: true,
            message: "อัปโหลดรูปภาพสำเร็จ",
            photo: {
                id: photo.id,
                fileUrl: photo.fileUrl,
                fileName: photo.fileName,
            },
        };
    } catch (error) {
        logError("Error uploading home visit photo:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ" };
    }
}

/**
 * Delete a home visit photo
 */
export async function deleteHomeVisitPhoto(
    photoId: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, message: "ไม่อนุญาตให้เข้าถึง" };
        }

        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminReadonly("ลบรูปภาพ"),
            };
        }

        const photo = await prisma.homeVisitPhoto.findUnique({
            where: { id: photoId },
            include: {
                homeVisit: {
                    select: {
                        studentId: true,
                        student: { select: { schoolId: true, class: true } },
                    },
                },
            },
        });

        if (!photo) {
            return { success: false, message: "ไม่พบรูปภาพที่ต้องการลบ" };
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
            return { success: false, message: "ไม่มีสิทธิ์ลบรูปภาพนี้" };
        }

        const canAccess = canAccessStudentByRole(
            {
                role: user.role,
                schoolId: user.schoolId,
                advisoryClass: user.teacher?.advisoryClass,
            },
            {
                schoolId: photo.homeVisit.student.schoolId,
                className: photo.homeVisit.student.class,
            },
        );

        if (!canAccess) {
            return { success: false, message: "ไม่มีสิทธิ์ลบรูปภาพนี้" };
        }

        // Delete file from disk
        const fileName = photo.fileUrl.replace("/api/uploads/home-visits/", "");
        const filePath = join(
            process.cwd(),
            ".data",
            "uploads",
            "home-visits",
            fileName,
        );
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath built from DB fileUrl, not user input
        if (existsSync(filePath)) {
            const { unlink } = await import("fs/promises");
            await unlink(filePath).catch(() => {});
        }

        // Delete DB record
        await prisma.homeVisitPhoto.delete({
            where: { id: photoId },
        });

        revalidatePath(`/students/${photo.homeVisit.studentId}`);

        return { success: true, message: "ลบรูปภาพสำเร็จ" };
    } catch (error) {
        logError("Error deleting home visit photo:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบรูปภาพ" };
    }
}

