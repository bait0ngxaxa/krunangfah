import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    acquireRedisLock: vi.fn(),
    auth: vi.fn(),
    canAccessStudentByRole: vi.fn(),
    compressWorksheetImageBuffer: vi.fn(),
    existsSync: vi.fn(),
    homeVisitFindFirst: vi.fn(),
    homeVisitPhotoFindUnique: vi.fn(),
    isSupportedWorksheetImageExtension: vi.fn(),
    logError: vi.fn(),
    mkdir: vi.fn(),
    revalidatePath: vi.fn(),
    releaseRedisLock: vi.fn(),
    transaction: vi.fn(),
    transactionHomeVisitFindFirst: vi.fn(),
    transactionPhotoCreate: vi.fn(),
    transactionPhotoFindMany: vi.fn(),
    transactionPhotoFindUnique: vi.fn(),
    unlink: vi.fn(),
    userFindUnique: vi.fn(),
    validateFileSignature: vi.fn(),
    writeFile: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/cache/redis-lock", () => ({
    acquireRedisLock: mocks.acquireRedisLock,
    releaseRedisLock: mocks.releaseRedisLock,
}));
vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: mocks.transaction,
        homeVisit: { findFirst: mocks.homeVisitFindFirst },
        homeVisitPhoto: { findUnique: mocks.homeVisitPhotoFindUnique },
        user: { findUnique: mocks.userFindUnique },
    },
}));
vi.mock("@/lib/security/student-access", () => ({
    canAccessStudentByRole: mocks.canAccessStudentByRole,
}));
vi.mock("@/lib/utils/file-signature", () => ({
    validateFileSignature: mocks.validateFileSignature,
}));
vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));
vi.mock("@/lib/utils/server-image-compression", () => ({
    compressWorksheetImageBuffer: mocks.compressWorksheetImageBuffer,
    isSupportedWorksheetImageExtension:
        mocks.isSupportedWorksheetImageExtension,
}));
vi.mock("fs", () => ({ existsSync: mocks.existsSync }));
vi.mock("fs/promises", () => ({
    mkdir: mocks.mkdir,
    unlink: mocks.unlink,
    writeFile: mocks.writeFile,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const { uploadHomeVisitPhoto } = await import(
    "@/lib/actions/home-visit-photo.actions"
);

describe("uploadHomeVisitPhoto", () => {
    let committedPhoto: {
        id: string;
        fileUrl: string;
        fileName: string;
    } | null;
    let physicalFiles: Set<string>;

    beforeEach(() => {
        vi.clearAllMocks();
        committedPhoto = null;
        physicalFiles = new Set();

        mocks.auth.mockResolvedValue({
            user: { id: "teacher-1", role: "class_teacher" },
        });
        mocks.homeVisitFindFirst.mockResolvedValue({
            id: "visit-1",
            studentId: "student-1",
            student: {
                schoolId: "school-1",
                class: "ม.1/1",
                status: "ACTIVE",
            },
        });
        mocks.homeVisitPhotoFindUnique.mockResolvedValue(null);
        mocks.userFindUnique.mockResolvedValue({
            schoolId: "school-1",
            role: "class_teacher",
            teacher: { advisoryClass: "ม.1/1" },
        });
        mocks.canAccessStudentByRole.mockReturnValue(true);
        mocks.existsSync.mockReturnValue(false);
        mocks.mkdir.mockResolvedValue(undefined);
        mocks.writeFile.mockImplementation(async (filePath: string) => {
            physicalFiles.add(filePath);
        });
        mocks.unlink.mockImplementation(async (filePath: string) => {
            physicalFiles.delete(filePath);
        });
        mocks.acquireRedisLock.mockResolvedValue({
            status: "acquired",
            lock: {
                key: "home-visit-photo-lock",
                token: "lock-token",
            },
        });
        mocks.releaseRedisLock.mockResolvedValue(undefined);
        mocks.validateFileSignature.mockReturnValue(true);
        mocks.isSupportedWorksheetImageExtension.mockReturnValue(true);
        mocks.compressWorksheetImageBuffer.mockImplementation(
            async (buffer: Buffer) => ({
                buffer,
                extension: "png",
                mimeType: "image/png",
            }),
        );

        mocks.transactionHomeVisitFindFirst.mockResolvedValue({
            id: "visit-1",
            studentId: "student-1",
        });
        mocks.transactionPhotoFindUnique.mockResolvedValue(null);
        mocks.transactionPhotoFindMany.mockResolvedValue([]);
        mocks.transactionPhotoCreate.mockImplementation(
            async (input: {
                data: { fileName: string; fileUrl: string };
            }) => {
                committedPhoto = {
                    id: "photo-1",
                    fileName: input.data.fileName,
                    fileUrl: input.data.fileUrl,
                };
                return { ...input.data, id: "photo-1" };
            },
        );
        mocks.transaction.mockImplementation(
            async (callback: (tx: unknown) => Promise<unknown>) =>
                callback({
                    homeVisit: {
                        findFirst: mocks.transactionHomeVisitFindFirst,
                    },
                    homeVisitPhoto: {
                        create: mocks.transactionPhotoCreate,
                        findMany: mocks.transactionPhotoFindMany,
                        findUnique: mocks.transactionPhotoFindUnique,
                    },
                }),
        );
        mocks.revalidatePath.mockImplementation(() => {
            throw new Error("cache unavailable");
        });
    });

    it("keeps the committed photo file when revalidation fails", async () => {
        const result = await uploadHomeVisitPhoto(
            "visit-1",
            createUploadFormData(),
        );

        expect(result).toEqual({
            success: true,
            message: "อัปโหลดรูปภาพสำเร็จ",
            photo: committedPhoto,
        });
        expect(committedPhoto).not.toBeNull();
        expect(physicalFiles.size).toBe(1);
        expect(mocks.unlink).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/students/student-1",
        );
        expect(mocks.logError).toHaveBeenCalledWith(
            "Failed to revalidate after home visit photo upload:",
            expect.any(Error),
        );
    });

    it("returns an in-progress error when another upload holds the lock", async () => {
        mocks.acquireRedisLock.mockResolvedValue({ status: "contended" });

        const result = await uploadHomeVisitPhoto(
            "visit-1",
            createUploadFormData(),
        );

        expect(result).toEqual({
            success: false,
            message: "มีการอัปโหลดรูปภาพนี้อยู่ กรุณารอสักครู่แล้วลองใหม่",
            error: "UPLOAD_IN_PROGRESS",
            retryable: true,
        });
        expect(mocks.writeFile).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
        expect(mocks.releaseRedisLock).not.toHaveBeenCalled();
    });

    it("uses the database-safe fallback when the lock service is unavailable", async () => {
        mocks.acquireRedisLock.mockResolvedValue({
            status: "unavailable",
            reason: "command_failed",
        });

        const result = await uploadHomeVisitPhoto(
            "visit-1",
            createUploadFormData(),
        );

        expect(result.success).toBe(true);
        expect(result.error).not.toBe("UPLOAD_IN_PROGRESS");
        expect(mocks.writeFile).toHaveBeenCalledOnce();
        expect(mocks.transaction).toHaveBeenCalledOnce();
        expect(mocks.releaseRedisLock).not.toHaveBeenCalled();
    });
});

function createUploadFormData(): FormData {
    const formData = new FormData();
    const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    formData.set("file", new File([pngBytes], "photo.png", { type: "image/png" }));
    formData.set(
        "uploadRequestId",
        "00000000-0000-4000-8000-000000000001",
    );
    return formData;
}
