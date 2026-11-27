"use server";

import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { Prisma } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import {
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    canGenerateActivitiesForAssessmentRound,
    getRequiredWorksheetCount,
} from "./constants";
import {
    getWorksheetUploadRejection,
    type WorksheetUploadRejection,
} from "./worksheet-upload-guard";
import { validateFileSignature } from "@/lib/utils/file-signature";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import type { UploadWorksheetResult } from "./types";
import { logError } from "@/lib/utils/logging";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import {
    MAX_IMAGE_UPLOAD_INPUT_SIZE,
    MAX_IMAGE_UPLOAD_INPUT_SIZE_MB,
    MAX_IMAGE_UPLOAD_SIZE_MB,
} from "@/lib/constants/image-upload";
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
import { verifyStudentActivityAccess } from "./access";
import { acquireRedisLock, releaseRedisLock } from "@/lib/cache/redis-lock";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";
import { getUploadRequestId } from "@/lib/validations/upload.validation";
import { canMutatePhqContext } from "@/lib/actions/care-record-current-policy";

const MAX_WORKSHEET_NUMBER_RETRIES = 3;
const WORKSHEET_UPLOAD_LOCK_TTL_SECONDS = 90;

class UploadWorksheetError extends Error {
    constructor(
        public readonly code:
            | "UPLOAD_IMAGE_COMPRESSION_FAILED"
            | "UPLOAD_FILE_WRITE_FAILED"
            | "UPLOAD_DB_FAILED"
            | "UPLOAD_ACTIVITY_NOT_FOUND"
            | "UPLOAD_ACCESS_DENIED"
            | WorksheetUploadRejection["code"],
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

const NON_RETRYABLE_UPLOAD_ERRORS: ReadonlySet<UploadWorksheetError["code"]> = new Set([
    "UPLOAD_IMAGE_COMPRESSION_FAILED",
    "UPLOAD_ACTIVITY_NOT_FOUND",
    "UPLOAD_ACCESS_DENIED",
    "UPLOAD_ACTIVITY_LOCKED",
    "UPLOAD_ACTIVITY_COMPLETED",
    "UPLOAD_LIMIT_REACHED",
]);

const STALE_ACTIVITY_UPLOAD_ERRORS: ReadonlySet<UploadWorksheetError["code"]> = new Set([
    "UPLOAD_ACTIVITY_LOCKED",
    "UPLOAD_ACTIVITY_COMPLETED",
    "UPLOAD_LIMIT_REACHED",
]);

function toUploadRejectionResult(
    rejection: WorksheetUploadRejection,
): UploadWorksheetResult {
    return {
        success: false,
        message: rejection.message,
        error: rejection.code,
        retryable: false,
        refreshRequired: true,
    };
}

function getValidExtension(fileName: string): string | null {
    const parts = fileName.split(".");
    if (parts.length < 2) {
        return null;
    }

    const ext = parts.pop()?.toLowerCase() ?? "";
    return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
}

function createWorksheetUploadLockKey(activityProgressId: string): string {
    return `lock:worksheet-upload:${activityProgressId}`;
}

async function reconcileIdempotentWorksheetUpload(
    idempotencyKey: string,
    activityProgressId: string,
    fallbackTeacherId: string,
): Promise<UploadWorksheetResult | null> {
    return runSerializableTransaction(async (tx) => {
        const upload = await tx.worksheetUpload.findUnique({
            where: { idempotencyKey },
            select: {
                id: true,
                activityProgressId: true,
                worksheetNumber: true,
                fileUrl: true,
                uploadedById: true,
                activityProgress: {
                    select: {
                        activityNumber: true,
                        studentId: true,
                        phqResultId: true,
                        phqResult: { select: { assessmentRound: true } },
                    },
                },
            },
        });

        if (!upload) return null;
        if (upload.activityProgressId !== activityProgressId) {
            return {
                success: false,
                message: "คำขออัปโหลดไม่ถูกต้อง",
                error: "UPLOAD_REQUEST_ID_INVALID" as const,
            };
        }

        if (
            !canGenerateActivitiesForAssessmentRound(
                upload.activityProgress.phqResult.assessmentRound,
            )
        ) {
            return {
                success: false,
                message: ERROR_MESSAGES.activity.roundOneOnly,
                error: "UPLOAD_ACCESS_DENIED" as const,
            };
        }

        const remainsCurrent = await canMutatePhqContext(
            upload.activityProgress.studentId,
            upload.activityProgress.phqResultId,
            tx,
        );
        if (!remainsCurrent) {
            return {
                success: false,
                message: ERROR_MESSAGES.activity.latestOnly,
                error: "UPLOAD_ACCESS_DENIED" as const,
            };
        }

        await tx.activityProgress.updateMany({
            where: { id: activityProgressId, teacherId: null },
            data: { teacherId: upload.uploadedById ?? fallbackTeacherId },
        });
        const uploadedCount = await tx.worksheetUpload.count({
            where: { activityProgressId },
        });
        const requiredCount = getRequiredWorksheetCount(
            upload.activityProgress.activityNumber,
        );

        return {
            success: true,
            message: "อัปโหลดใบงานสำเร็จ",
            worksheet: {
                id: upload.id,
                worksheetNumber: upload.worksheetNumber,
                filePath: upload.fileUrl,
            },
            uploadedCount,
            requiredCount,
            allUploaded: uploadedCount >= requiredCount,
            activityNumber: upload.activityProgress.activityNumber,
        };
    });
}

async function withWorksheetUploadLock(
    activityProgressId: string,
    callback: () => Promise<UploadWorksheetResult>,
): Promise<UploadWorksheetResult> {
    const lockResult = await acquireRedisLock(
        createWorksheetUploadLockKey(activityProgressId),
        WORKSHEET_UPLOAD_LOCK_TTL_SECONDS,
    );

    if (lockResult.status === "contended") {
        return {
            success: false,
            message: "มีการอัปโหลดใบงานนี้อยู่ กรุณารอสักครู่แล้วลองใหม่",
            error: "UPLOAD_IN_PROGRESS",
            retryable: true,
        };
    }

    if (lockResult.status === "unavailable") {
        logError(
            "Worksheet upload lock unavailable; using database-safe fallback:",
            new Error(lockResult.reason),
        );
        return callback();
    }

    try {
        return await callback();
    } finally {
        await releaseRedisLock(lockResult.lock);
    }
}

export async function uploadWorksheet(
    activityProgressId: string,
    formData: FormData,
): Promise<UploadWorksheetResult> {
    try {
        const session = await requireAuth();

        // system_admin เป็น readonly — ไม่สามารถอัปโหลดใบงานได้
        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminUploadWorksheet,
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
                message: "ไม่พบไฟล์ใบงาน",
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

        // Authorize and reject stale activity state before the costly file processing.
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
                phqResult: {
                    select: { assessmentRound: true },
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

        const { allowed, error } = await verifyStudentActivityAccess(
            activityProgress.student.id,
            session.user.id,
            session.user.role,
            "manage",
        );

        if (!allowed) {
            return {
                success: false,
                message: error || "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
                error: "UPLOAD_ACCESS_DENIED",
            };
        }

        if (
            !canGenerateActivitiesForAssessmentRound(
                activityProgress.phqResult.assessmentRound,
            )
        ) {
            return {
                success: false,
                message: ERROR_MESSAGES.activity.roundOneOnly,
                error: "UPLOAD_ACCESS_DENIED",
            };
        }

        const isCurrentContext = await canMutatePhqContext(
            activityProgress.student.id,
            activityProgress.phqResultId,
        );
        if (!isCurrentContext) {
            return {
                success: false,
                message: ERROR_MESSAGES.activity.latestOnly,
                error: "UPLOAD_ACCESS_DENIED",
            };
        }

        const existingUpload = await reconcileIdempotentWorksheetUpload(
            idempotencyKey,
            activityProgressId,
            session.user.id,
        );
        if (existingUpload) {
            return existingUpload;
        }

        const preUploadRejection = getWorksheetUploadRejection(
            activityProgress,
            activityProgress.worksheetUploads.length,
        );
        if (preUploadRejection) {
            return toUploadRejectionResult(preUploadRejection);
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
                message: `ไฟล์ใหญ่เกินไปหลังบีบอัด (สูงสุด ${MAX_IMAGE_UPLOAD_SIZE_MB}MB)`,
                error: "UPLOAD_FILE_TOO_LARGE",
            };
        }

        // Awaited so errors thrown inside the lock reach the catch below and map to a result.
        return await withWorksheetUploadLock(activityProgressId, async () => {
            const uploadAfterLock = await reconcileIdempotentWorksheetUpload(
                idempotencyKey,
                activityProgressId,
                session.user.id,
            );
            if (uploadAfterLock) {
                return uploadAfterLock;
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

            // Generate a collision-resistant physical filename using the validated extension.
            const fileName = `${randomUUID()}.${outputExt}`;
            const filePath = buildWorksheetFilePath(fileName);

            // Save file to disk
            try {
                // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath built from random UUID + whitelist-validated extension
                await writeFile(filePath, buffer);
            } catch (error) {
                throw new UploadWorksheetError(
                    "UPLOAD_FILE_WRITE_FAILED",
                    "ไม่สามารถบันทึกไฟล์ได้ กรุณาลองใหม่อีกครั้ง",
                    { cause: error },
                );
            }

            // Save metadata and required post-processing atomically. The physical
            // file remains outside PostgreSQL and is compensated if this fails.
            const fileUrl = buildWorksheetFileUrl(fileName);

            try {
                for (
                    let attempt = 0;
                    attempt < MAX_WORKSHEET_NUMBER_RETRIES;
                    attempt++
                ) {
                    try {
                        const saved = await runSerializableTransaction(
                            async (tx) => {
                                const currentActivity =
                                    await tx.activityProgress.findUnique({
                                        where: { id: activityProgressId },
                                        select: {
                                            id: true,
                                            studentId: true,
                                            phqResultId: true,
                                            activityNumber: true,
                                            status: true,
                                            phqResult: {
                                                select: { assessmentRound: true },
                                            },
                                        },
                                    });
                                if (!currentActivity) {
                                    throw new UploadWorksheetError(
                                        "UPLOAD_ACTIVITY_NOT_FOUND",
                                        "ไม่พบข้อมูลกิจกรรม",
                                    );
                                }

                                if (
                                    !canGenerateActivitiesForAssessmentRound(
                                        currentActivity.phqResult.assessmentRound,
                                    )
                                ) {
                                    throw new UploadWorksheetError(
                                        "UPLOAD_ACCESS_DENIED",
                                        ERROR_MESSAGES.activity.roundOneOnly,
                                    );
                                }

                                const remainsCurrent =
                                    await canMutatePhqContext(
                                        currentActivity.studentId,
                                        currentActivity.phqResultId,
                                        tx,
                                    );
                                if (!remainsCurrent) {
                                    throw new UploadWorksheetError(
                                        "UPLOAD_ACCESS_DENIED",
                                        ERROR_MESSAGES.activity.latestOnly,
                                    );
                                }

                                const existingUploads =
                                    await tx.worksheetUpload.findMany({
                                        where: { activityProgressId },
                                        select: { worksheetNumber: true },
                                    });
                                // Authoritative re-check: status or count may have changed since the pre-check.
                                const rejection = getWorksheetUploadRejection(
                                    currentActivity,
                                    existingUploads.length,
                                );
                                if (rejection) {
                                    throw new UploadWorksheetError(
                                        rejection.code,
                                        rejection.message,
                                    );
                                }
                                const existingNumbers = new Set(
                                    existingUploads.map(
                                        (item) => item.worksheetNumber,
                                    ),
                                );
                                let worksheetNumber = 1;
                                while (existingNumbers.has(worksheetNumber)) {
                                    worksheetNumber++;
                                }

                                const upload = await tx.worksheetUpload.create({
                                    data: {
                                        activityProgressId,
                                        worksheetNumber,
                                        fileName: file.name,
                                        fileUrl,
                                        fileType: outputFileType,
                                        fileSize: buffer.length,
                                        uploadedById: session.user.id,
                                        idempotencyKey,
                                    },
                                    select: { id: true },
                                });
                                await tx.activityProgress.updateMany({
                                    where: {
                                        id: activityProgressId,
                                        teacherId: null,
                                    },
                                    data: { teacherId: session.user.id },
                                });
                                const uploadedCount =
                                    await tx.worksheetUpload.count({
                                        where: { activityProgressId },
                                    });
                                const requiredCount = getRequiredWorksheetCount(
                                    currentActivity.activityNumber,
                                );

                                return {
                                    upload,
                                    worksheetNumber,
                                    uploadedCount,
                                    requiredCount,
                                    activityNumber:
                                        currentActivity.activityNumber,
                                };
                            },
                        );

                        return {
                            success: true,
                            message: "อัปโหลดใบงานสำเร็จ",
                            worksheet: {
                                id: saved.upload.id,
                                worksheetNumber: saved.worksheetNumber,
                                filePath: fileUrl,
                            },
                            uploadedCount: saved.uploadedCount,
                            requiredCount: saved.requiredCount,
                            allUploaded:
                                saved.uploadedCount >= saved.requiredCount,
                            activityNumber: saved.activityNumber,
                        };
                    } catch (createError) {
                        if (
                            createError instanceof
                                Prisma.PrismaClientKnownRequestError &&
                            createError.code === "P2002"
                        ) {
                            const duplicateUpload =
                                await reconcileIdempotentWorksheetUpload(
                                    idempotencyKey,
                                    activityProgressId,
                                    session.user.id,
                                );
                            if (duplicateUpload) {
                                const { unlink } = await import("fs/promises");
                                await unlink(filePath).catch(() => {});
                                return duplicateUpload;
                            }
                            if (attempt < MAX_WORKSHEET_NUMBER_RETRIES - 1) {
                                continue;
                            }
                        }
                        throw createError;
                    }
                }
                throw new Error("ไม่สามารถกำหนดหมายเลขใบงานได้");
            } catch (dbError) {
                // Clean up orphaned file if DB insert fails
                const { unlink } = await import("fs/promises");
                await unlink(filePath).catch(() => {});
                if (dbError instanceof UploadWorksheetError) throw dbError;
                throw new UploadWorksheetError(
                    "UPLOAD_DB_FAILED",
                    "ไม่สามารถบันทึกข้อมูลไฟล์ได้ กรุณาลองใหม่อีกครั้ง",
                    { cause: dbError },
                );
            }
        });
    } catch (error) {
        logError("Error uploading worksheet:", error);
        if (error instanceof UploadWorksheetError) {
            return {
                success: false,
                message: error.message,
                error: error.code,
                retryable: !NON_RETRYABLE_UPLOAD_ERRORS.has(error.code),
                ...(STALE_ACTIVITY_UPLOAD_ERRORS.has(error.code)
                    ? { refreshRequired: true }
                    : {}),
            };
        }

        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการอัปโหลดใบงาน",
            error: "UPLOAD_UNKNOWN_ERROR",
            retryable: true,
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
        const session = await requireAuth();

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
                        student: {
                            select: {
                                id: true,
                                schoolId: true,
                                class: true,
                            },
                        },
                        phqResult: {
                            select: { assessmentRound: true },
                        },
                    },
                },
            },
        });

        if (!upload) {
            return { success: false, message: "ไม่พบไฟล์ที่ต้องการลบ" };
        }

        const { allowed, error } = await verifyStudentActivityAccess(
            upload.activityProgress.student.id,
            session.user.id,
            session.user.role,
            "manage",
        );

        if (!allowed) {
            return {
                success: false,
                message: error || "ไม่มีสิทธิ์ลบไฟล์นี้",
            };
        }

        if (
            !canGenerateActivitiesForAssessmentRound(
                upload.activityProgress.phqResult.assessmentRound,
            )
        ) {
            return {
                success: false,
                message: ERROR_MESSAGES.activity.roundOneOnly,
            };
        }

        const activityProgress = upload.activityProgress;
        const isCurrentContext = await canMutatePhqContext(
            activityProgress.student.id,
            activityProgress.phqResultId,
        );
        if (!isCurrentContext) {
            return {
                success: false,
                message: ERROR_MESSAGES.activity.latestOnly,
            };
        }

        if (!extractWorksheetFileName(upload.fileUrl)) {
            return { success: false, message: "ไม่พบไฟล์ที่ต้องการลบ" };
        }

        const requiredCount = getRequiredWorksheetCount(
            activityProgress.activityNumber,
        );

        const deleted = await runSerializableTransaction(async (tx) => {
            const currentActivity = await tx.activityProgress.findUnique({
                where: { id: activityProgress.id },
                select: {
                    status: true,
                    phqResult: { select: { assessmentRound: true } },
                },
            });
            if (!currentActivity) return false;
            if (
                !canGenerateActivitiesForAssessmentRound(
                    currentActivity.phqResult.assessmentRound,
                )
            ) {
                return false;
            }

            const remainsCurrent = await canMutatePhqContext(
                activityProgress.student.id,
                activityProgress.phqResultId,
                tx,
            );
            if (!remainsCurrent) return false;

            await tx.worksheetUpload.delete({
                where: { id: uploadId },
            });
            await tx.fileDeletionOutbox.createMany({
                data: [{ fileUrl: upload.fileUrl }],
                skipDuplicates: true,
            });
            const remainingCount = await tx.worksheetUpload.count({
                where: { activityProgressId: activityProgress.id },
            });
            if (
                remainingCount < requiredCount &&
                (currentActivity?.status === "completed" ||
                    currentActivity?.status === "pending_assessment")
            ) {
                await tx.activityProgress.updateMany({
                    where: {
                        id: activityProgress.id,
                        status: {
                            in: ["completed", "pending_assessment"],
                        },
                    },
                    data: {
                        status: "in_progress",
                        completedAt: null,
                    },
                });
            }
            return true;
        });
        if (!deleted) {
            return {
                success: false,
                message: ERROR_MESSAGES.activity.latestOnly,
            };
        }

        await revalidateAnalyticsCache(upload.activityProgress.student.schoolId);

        return { success: true, message: "ลบไฟล์สำเร็จ" };
    } catch (error) {
        logError("Error deleting worksheet:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบไฟล์" };
    }
}
