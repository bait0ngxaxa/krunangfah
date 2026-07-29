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

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { validateFileSignature } from "@/lib/utils/file-signature";
import { canAccessStudentByRole } from "@/lib/security/student-access";
import { revalidatePath } from "next/cache";
import { logError } from "@/lib/utils/logging";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import {
    MAX_IMAGE_UPLOAD_INPUT_SIZE,
    MAX_IMAGE_UPLOAD_INPUT_SIZE_MB,
    MAX_IMAGE_UPLOAD_SIZE,
    MAX_IMAGE_UPLOAD_SIZE_MB,
} from "@/lib/constants/image-upload";
import {
    compressWorksheetImageBuffer,
    isSupportedWorksheetImageExtension,
} from "@/lib/utils/server-image-compression";
import { getStudentActionBlockedMessage } from "@/lib/constants/student-status";
import { acquireRedisLock, releaseRedisLock } from "@/lib/cache/redis-lock";
import { getUploadRequestId } from "@/lib/validations/upload.validation";

/** Allowed image extensions for home visit photos */
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

/** Maximum file size after compression */
const MAX_FILE_SIZE = MAX_IMAGE_UPLOAD_SIZE;

/** Maximum photos per home visit */
const MAX_PHOTOS_PER_VISIT = 5;
const MAX_HOME_VISIT_SLOT_RETRIES = MAX_PHOTOS_PER_VISIT + 1;
const HOME_VISIT_UPLOAD_LOCK_TTL_SECONDS = 90;

export interface HomeVisitPhotoUploadResult {
    success: boolean;
    message: string;
    error?:
        | "UPLOAD_UNAUTHORIZED"
        | "UPLOAD_REQUEST_ID_INVALID"
        | "UPLOAD_FILE_MISSING"
        | "UPLOAD_FILE_TOO_LARGE"
        | "UPLOAD_INVALID_EXTENSION"
        | "UPLOAD_SIGNATURE_MISMATCH"
        | "UPLOAD_NOT_FOUND"
        | "UPLOAD_ACCESS_DENIED"
        | "UPLOAD_LIMIT_REACHED"
        | "UPLOAD_IN_PROGRESS"
        | "UPLOAD_IMAGE_COMPRESSION_FAILED"
        | "UPLOAD_UNKNOWN_ERROR";
    retryable?: boolean;
    photo?: { id: string; fileUrl: string; fileName: string };
}

function getValidExtension(fileName: string): string | null {
    const parts = fileName.split(".");
    if (parts.length < 2) {
        return null;
    }

    const ext = parts.pop()?.toLowerCase() ?? "";
    return ALLOWED_IMAGE_EXTENSIONS.has(ext) ? ext : null;
}

function createHomeVisitPhotoLockKey(homeVisitId: string): string {
    return `lock:home-visit-photo-upload:${homeVisitId}`;
}

async function withHomeVisitPhotoLock(
    homeVisitId: string,
    callback: () => Promise<HomeVisitPhotoUploadResult>,
): Promise<HomeVisitPhotoUploadResult> {
    const lock = await acquireRedisLock(
        createHomeVisitPhotoLockKey(homeVisitId),
        HOME_VISIT_UPLOAD_LOCK_TTL_SECONDS,
    );
    if (!lock) {
        return {
            success: false,
            message: "มีการอัปโหลดรูปภาพนี้อยู่ กรุณารอสักครู่แล้วลองใหม่",
            error: "UPLOAD_IN_PROGRESS",
            retryable: true,
        };
    }

    try {
        return await callback();
    } finally {
        await releaseRedisLock(lock);
    }
}

type HomeVisitPhotoDbClient = Pick<
    Prisma.TransactionClient,
    "homeVisitPhoto"
>;

async function findIdempotentHomeVisitPhoto(
    client: HomeVisitPhotoDbClient,
    idempotencyKey: string,
    homeVisitId: string,
): Promise<HomeVisitPhotoUploadResult | null> {
    const photo = await client.homeVisitPhoto.findUnique({
        where: { idempotencyKey },
        select: { id: true, homeVisitId: true, fileName: true, fileUrl: true },
    });

    if (!photo) {
        return null;
    }
    if (photo.homeVisitId !== homeVisitId) {
        return {
            success: false,
            message: "คำขออัปโหลดไม่ถูกต้อง",
            error: "UPLOAD_REQUEST_ID_INVALID",
        };
    }

    return {
        success: true,
        message: "อัปโหลดรูปภาพสำเร็จ",
        photo: {
            id: photo.id,
            fileName: photo.fileName,
            fileUrl: photo.fileUrl,
        },
    };
}

async function findAvailableHomeVisitPhotoSlot(
    client: HomeVisitPhotoDbClient,
    homeVisitId: string,
): Promise<number | null> {
    const photos = await client.homeVisitPhoto.findMany({
        where: { homeVisitId },
        select: { slot: true },
    });
    const occupiedSlots = new Set(photos.map((photo) => photo.slot));

    for (let slot = 1; slot <= MAX_PHOTOS_PER_VISIT; slot++) {
        if (!occupiedSlots.has(slot)) {
            return slot;
        }
    }

    return null;
}

function isRetryablePhotoTransactionError(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
    );
}

interface CreateHomeVisitPhotoInput {
    homeVisitId: string;
    idempotencyKey: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
}

type HomeVisitPhotoTransactionResult =
    | {
          kind: "created";
          photo: { id: string; fileUrl: string; fileName: string };
      }
    | { kind: "existing"; result: HomeVisitPhotoUploadResult }
    | { kind: "not-found" }
    | { kind: "limit-reached" };

type HomeVisitPhotoTransactionCheck =
    | { kind: "ready"; slot: number }
    | Exclude<HomeVisitPhotoTransactionResult, { kind: "created" }>;

async function checkHomeVisitPhotoTransaction(
    tx: Prisma.TransactionClient,
    input: CreateHomeVisitPhotoInput,
): Promise<HomeVisitPhotoTransactionCheck> {
    const homeVisit = await tx.homeVisit.findFirst({
        where: { id: input.homeVisitId, deletedAt: null },
        select: { id: true, studentId: true },
    });
    if (!homeVisit) {
        return { kind: "not-found" };
    }

    const existingPhoto = await findIdempotentHomeVisitPhoto(
        tx,
        input.idempotencyKey,
        input.homeVisitId,
    );
    if (existingPhoto) {
        return { kind: "existing", result: existingPhoto };
    }

    const slot = await findAvailableHomeVisitPhotoSlot(tx, input.homeVisitId);
    return slot === null ? { kind: "limit-reached" } : { kind: "ready", slot };
}

async function createHomeVisitPhotoRecord(
    input: CreateHomeVisitPhotoInput,
): Promise<HomeVisitPhotoTransactionResult> {
    return prisma.$transaction(
        async (tx): Promise<HomeVisitPhotoTransactionResult> => {
            const check = await checkHomeVisitPhotoTransaction(tx, input);
            if (check.kind !== "ready") {
                return check;
            }

            const photo = await tx.homeVisitPhoto.create({
                data: {
                    homeVisitId: input.homeVisitId,
                    slot: check.slot,
                    fileName: input.fileName,
                    fileUrl: input.fileUrl,
                    fileType: input.fileType,
                    fileSize: input.fileSize,
                    idempotencyKey: input.idempotencyKey,
                },
            });

            return {
                kind: "created",
                photo: {
                    id: photo.id,
                    fileUrl: photo.fileUrl,
                    fileName: photo.fileName,
                },
            };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
}

/**
 * Upload a photo for a home visit
 */
export async function uploadHomeVisitPhoto(
    homeVisitId: string,
    formData: FormData,
): Promise<HomeVisitPhotoUploadResult> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return {
                success: false,
                message: "ไม่อนุญาตให้เข้าถึง",
                error: "UPLOAD_UNAUTHORIZED",
            };
        }

        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminReadonly("อัปโหลดรูปภาพ"),
                error: "UPLOAD_ACCESS_DENIED",
            };
        }

        const idempotencyKey = getUploadRequestId(formData);
        if (!idempotencyKey) {
            return {
                success: false,
                message: "คำขออัปโหลดไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
                error: "UPLOAD_REQUEST_ID_INVALID",
            };
        }

        const file = formData.get("file") as File;
        if (!file) {
            return {
                success: false,
                message: "ไม่พบไฟล์",
                error: "UPLOAD_FILE_MISSING",
            };
        }
        if (file.size > MAX_IMAGE_UPLOAD_INPUT_SIZE) {
            return {
                success: false,
                message: `ไฟล์ต้นฉบับใหญ่เกินไป (สูงสุด ${MAX_IMAGE_UPLOAD_INPUT_SIZE_MB}MB)`,
                error: "UPLOAD_FILE_TOO_LARGE",
            };
        }

        // Validate file extension (images only)
        const ext = getValidExtension(file.name);
        if (!ext) {
            return {
                success: false,
                message: "รองรับไฟล์รูปภาพ .jpg, .jpeg, .png เท่านั้น",
                error: "UPLOAD_INVALID_EXTENSION",
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
                error: "UPLOAD_SIGNATURE_MISMATCH",
            };
        }

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
            outputMimeType = compressed.mimeType;
        } catch (error) {
            logError("Home visit image compression failed:", error);
            return {
                success: false,
                message: "ไม่สามารถบีบอัดรูปภาพได้ กรุณาเลือกรูปอื่นแล้วลองใหม่",
                error: "UPLOAD_IMAGE_COMPRESSION_FAILED",
            };
        }

        if (buffer.length > MAX_FILE_SIZE) {
            return {
                success: false,
                message: `ไฟล์ใหญ่เกินไปหลังบีบอัด (สูงสุด ${MAX_IMAGE_UPLOAD_SIZE_MB}MB)`,
                error: "UPLOAD_FILE_TOO_LARGE",
            };
        }

        // Get home visit with student info for authorization
        const homeVisit = await prisma.homeVisit.findFirst({
            where: { id: homeVisitId, deletedAt: null },
            select: {
                id: true,
                studentId: true,
                student: {
                    select: { schoolId: true, class: true, status: true },
                },
            },
        });

        if (!homeVisit) {
            return {
                success: false,
                message: "ไม่พบข้อมูลการเยี่ยมบ้าน",
                error: "UPLOAD_NOT_FOUND",
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
                schoolId: homeVisit.student.schoolId,
                className: homeVisit.student.class,
            },
        );

        if (!canAccess) {
            return {
                success: false,
                message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
                error: "UPLOAD_ACCESS_DENIED",
            };
        }

        const statusError = getStudentActionBlockedMessage(
            homeVisit.student.status,
        );
        if (statusError) {
            return {
                success: false,
                message: statusError,
                error: "UPLOAD_ACCESS_DENIED",
            };
        }

        const existingPhoto = await findIdempotentHomeVisitPhoto(
            prisma,
            idempotencyKey,
            homeVisitId,
        );
        if (existingPhoto) {
            return existingPhoto;
        }

        return withHomeVisitPhotoLock(homeVisitId, async () => {
            const photoAfterLock = await findIdempotentHomeVisitPhoto(
                prisma,
                idempotencyKey,
                homeVisitId,
            );
            if (photoAfterLock) {
                return photoAfterLock;
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

            for (
                let attempt = 0;
                attempt < MAX_HOME_VISIT_SLOT_RETRIES;
                attempt++
            ) {
                const fileName = `${randomUUID()}.${outputExt}`;
                const filePath = join(uploadDir, fileName);

                // Save file to disk
                // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath built from random UUID + whitelist-validated extension
                await writeFile(filePath, buffer);

                const fileUrl = `/api/uploads/home-visits/${fileName}`;
                try {
                    const transactionResult = await createHomeVisitPhotoRecord({
                        homeVisitId,
                        idempotencyKey,
                        fileName: file.name,
                        fileUrl,
                        fileType: outputMimeType,
                        fileSize: buffer.length,
                    });

                    if (transactionResult.kind === "created") {
                        revalidatePath(`/students/${homeVisit.studentId}`);

                        return {
                            success: true,
                            message: "อัปโหลดรูปภาพสำเร็จ",
                            photo: transactionResult.photo,
                        };
                    }

                    const { unlink } = await import("fs/promises");
                    await unlink(filePath).catch(() => {});

                    if (transactionResult.kind === "existing") {
                        return transactionResult.result;
                    }
                    if (transactionResult.kind === "not-found") {
                        return {
                            success: false,
                            message: "ไม่พบข้อมูลการเยี่ยมบ้าน",
                            error: "UPLOAD_NOT_FOUND",
                        };
                    }
                    return {
                        success: false,
                        message: `อัปโหลดรูปภาพได้สูงสุด ${MAX_PHOTOS_PER_VISIT} รูปต่อครั้ง`,
                        error: "UPLOAD_LIMIT_REACHED",
                    };
                } catch (dbError) {
                    const duplicatePhoto = await findIdempotentHomeVisitPhoto(
                        prisma,
                        idempotencyKey,
                        homeVisitId,
                    );
                    const { unlink } = await import("fs/promises");
                    await unlink(filePath).catch(() => {});
                    if (duplicatePhoto) {
                        return duplicatePhoto;
                    }
                    if (!isRetryablePhotoTransactionError(dbError)) {
                        throw dbError;
                    }
                    if (attempt === MAX_HOME_VISIT_SLOT_RETRIES - 1) {
                        throw dbError;
                    }
                }
            }

            throw new Error("ไม่สามารถกำหนดช่องรูปภาพได้");
        });
    } catch (error) {
        logError("Error uploading home visit photo:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ",
            error: "UPLOAD_UNKNOWN_ERROR",
            retryable: true,
        };
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
                        student: {
                            select: {
                                schoolId: true,
                                class: true,
                                status: true,
                            },
                        },
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

        const statusError = getStudentActionBlockedMessage(
            photo.homeVisit.student.status,
        );
        if (statusError) {
            return { success: false, message: statusError };
        }

        await prisma.$transaction(async (tx) => {
            await tx.homeVisitPhoto.delete({
                where: { id: photoId },
            });
            await tx.fileDeletionOutbox.createMany({
                data: [{ fileUrl: photo.fileUrl }],
                skipDuplicates: true,
            });
        });

        revalidatePath(`/students/${photo.homeVisit.studentId}`);

        return { success: true, message: "ลบรูปภาพสำเร็จ" };
    } catch (error) {
        logError("Error deleting home visit photo:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบรูปภาพ" };
    }
}

