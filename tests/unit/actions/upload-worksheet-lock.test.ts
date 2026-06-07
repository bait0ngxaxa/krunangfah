import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    activityProgressFindUnique: vi.fn(),
    worksheetUploadFindMany: vi.fn(),
    worksheetUploadCreate: vi.fn(),
    worksheetUploadCount: vi.fn(),
    activityProgressUpdate: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    existsSync: vi.fn(),
    compressWorksheetImageBuffer: vi.fn(),
    verifyStudentActivityAccess: vi.fn(),
    acquireRedisLock: vi.fn(),
    releaseRedisLock: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
    auth: mocks.auth,
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        activityProgress: {
            findUnique: mocks.activityProgressFindUnique,
            update: mocks.activityProgressUpdate,
        },
        worksheetUpload: {
            findMany: mocks.worksheetUploadFindMany,
            create: mocks.worksheetUploadCreate,
            count: mocks.worksheetUploadCount,
        },
    },
}));

vi.mock("fs/promises", () => ({
    mkdir: mocks.mkdir,
    writeFile: mocks.writeFile,
}));

vi.mock("fs", () => ({
    existsSync: mocks.existsSync,
}));

vi.mock("@/lib/utils/server-image-compression", () => ({
    compressWorksheetImageBuffer: mocks.compressWorksheetImageBuffer,
    isSupportedWorksheetImageExtension: vi.fn(() => true),
}));

vi.mock("@/lib/actions/activity/access", () => ({
    verifyStudentActivityAccess: mocks.verifyStudentActivityAccess,
}));

vi.mock("@/lib/redis-lock", () => ({
    acquireRedisLock: mocks.acquireRedisLock,
    releaseRedisLock: mocks.releaseRedisLock,
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

const { uploadWorksheet } = await import("@/lib/actions/activity/file-utils");

function createWorksheetFormData(): FormData {
    const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const file = new File([pngBytes], "worksheet.png", {
        type: "image/png",
    });
    const formData = new FormData();
    formData.set("file", file);
    return formData;
}

describe("uploadWorksheet lock", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: {
                id: "teacher-1",
                role: "school_admin",
            },
        });
        mocks.activityProgressFindUnique.mockResolvedValue({
            id: "progress-1",
            studentId: "student-1",
            activityNumber: 1,
            teacherId: null,
            student: {
                id: "student-db-1",
                schoolId: "school-1",
                class: "ม.1/1",
            },
            worksheetUploads: [],
        });
        mocks.verifyStudentActivityAccess.mockResolvedValue({
            allowed: true,
            error: null,
        });
        mocks.compressWorksheetImageBuffer.mockResolvedValue({
            buffer: Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
            ]),
            extension: "png",
            mimeType: "image/png",
        });
    });

    it("returns an in-progress error when another upload holds the lock", async () => {
        mocks.acquireRedisLock.mockResolvedValue(null);

        const result = await uploadWorksheet(
            "progress-1",
            createWorksheetFormData(),
        );

        expect(result).toEqual({
            success: false,
            message: "มีการอัปโหลดใบงานนี้อยู่ กรุณารอสักครู่แล้วลองใหม่",
            error: "UPLOAD_IN_PROGRESS",
        });
        expect(mocks.acquireRedisLock).toHaveBeenCalledWith(
            "lock:worksheet-upload:progress-1",
            30,
        );
        expect(mocks.writeFile).not.toHaveBeenCalled();
        expect(mocks.worksheetUploadCreate).not.toHaveBeenCalled();
        expect(mocks.releaseRedisLock).not.toHaveBeenCalled();
    });

    it("releases the upload lock after a successful upload", async () => {
        const lock = { key: "lock:worksheet-upload:progress-1", token: "token-1" };
        mocks.acquireRedisLock.mockResolvedValue(lock);
        mocks.existsSync.mockReturnValue(true);
        mocks.writeFile.mockResolvedValue(undefined);
        mocks.worksheetUploadFindMany.mockResolvedValue([]);
        mocks.worksheetUploadCreate.mockResolvedValue({ id: "upload-1" });
        mocks.worksheetUploadCount.mockResolvedValue(1);
        mocks.activityProgressUpdate.mockResolvedValue({ id: "progress-1" });

        const result = await uploadWorksheet(
            "progress-1",
            createWorksheetFormData(),
        );

        expect(result.success).toBe(true);
        expect(result.worksheet?.worksheetNumber).toBe(1);
        expect(mocks.releaseRedisLock).toHaveBeenCalledWith(lock);
    });
});
