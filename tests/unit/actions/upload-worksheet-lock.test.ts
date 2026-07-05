import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    requireAuth: vi.fn(),
    activityProgressFindUnique: vi.fn(),
    worksheetUploadFindMany: vi.fn(),
    worksheetUploadFindUnique: vi.fn(),
    worksheetUploadCreate: vi.fn(),
    worksheetUploadDelete: vi.fn(),
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

vi.mock("@/lib/auth/session", () => ({
    requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        activityProgress: {
            findUnique: mocks.activityProgressFindUnique,
            update: mocks.activityProgressUpdate,
        },
        worksheetUpload: {
            findMany: mocks.worksheetUploadFindMany,
            findUnique: mocks.worksheetUploadFindUnique,
            create: mocks.worksheetUploadCreate,
            delete: mocks.worksheetUploadDelete,
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

vi.mock("@/lib/cache/redis-lock", () => ({
    acquireRedisLock: mocks.acquireRedisLock,
    releaseRedisLock: mocks.releaseRedisLock,
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

const { uploadWorksheet, deleteWorksheetUpload } = await import(
    "@/lib/actions/activity/file-utils"
);

function createWorksheetFormData(): FormData {
    const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const file = new File([pngBytes], "worksheet.png", {
        type: "image/png",
    });
    const formData = new FormData();
    formData.set("file", file);
    formData.set("uploadRequestId", "00000000-0000-4000-8000-000000000001");
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
        mocks.requireAuth.mockResolvedValue({
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
        mocks.worksheetUploadDelete.mockResolvedValue({ id: "upload-1" });
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
            retryable: true,
        });
        expect(mocks.acquireRedisLock).toHaveBeenCalledWith(
            "lock:worksheet-upload:progress-1",
            90,
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

    it("returns the completed upload for a repeated request id", async () => {
        mocks.worksheetUploadFindUnique.mockResolvedValue({
            id: "upload-1",
            activityProgressId: "progress-1",
            worksheetNumber: 1,
            fileUrl: "/api/uploads/worksheets/upload-1.png",
            activityProgress: { activityNumber: 1 },
        });
        mocks.worksheetUploadCount.mockResolvedValue(1);

        const result = await uploadWorksheet(
            "progress-1",
            createWorksheetFormData(),
        );

        expect(result).toMatchObject({
            success: true,
            worksheet: {
                id: "upload-1",
                worksheetNumber: 1,
            },
        });
        expect(mocks.acquireRedisLock).not.toHaveBeenCalled();
        expect(mocks.writeFile).not.toHaveBeenCalled();
    });

    it("uses fresh role claims before checking upload access", async () => {
        mocks.auth.mockResolvedValue({
            user: {
                id: "teacher-1",
                role: "school_admin",
            },
        });
        mocks.requireAuth.mockResolvedValue({
            user: {
                id: "teacher-1",
                role: "class_teacher",
            },
        });
        mocks.verifyStudentActivityAccess.mockImplementation(
            async (
                _studentId: string,
                _userId: string,
                userRole: string,
            ): Promise<{ allowed: boolean; error: string | null }> => ({
                allowed: userRole !== "class_teacher",
                error:
                    userRole === "class_teacher"
                        ? "คุณสามารถเข้าถึงข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น"
                        : null,
            }),
        );
        const lock = { key: "lock:worksheet-upload:progress-1", token: "token-1" };
        mocks.acquireRedisLock.mockResolvedValue(lock);
        mocks.existsSync.mockReturnValue(true);
        mocks.writeFile.mockResolvedValue(undefined);
        mocks.worksheetUploadFindMany.mockResolvedValue([]);
        mocks.worksheetUploadCreate.mockResolvedValue({ id: "upload-1" });
        mocks.worksheetUploadCount.mockResolvedValue(1);

        const result = await uploadWorksheet(
            "progress-1",
            createWorksheetFormData(),
        );

        expect(result).toMatchObject({
            success: false,
            error: "UPLOAD_ACCESS_DENIED",
        });
        expect(mocks.verifyStudentActivityAccess).toHaveBeenCalledWith(
            "student-db-1",
            "teacher-1",
            "class_teacher",
            "manage",
        );
        expect(mocks.writeFile).not.toHaveBeenCalled();
        expect(mocks.worksheetUploadCreate).not.toHaveBeenCalled();
    });

    it("uses fresh role claims before checking delete access", async () => {
        mocks.auth.mockResolvedValue({
            user: {
                id: "teacher-1",
                role: "school_admin",
            },
        });
        mocks.requireAuth.mockResolvedValue({
            user: {
                id: "teacher-1",
                role: "class_teacher",
            },
        });
        mocks.worksheetUploadFindUnique.mockResolvedValue({
            id: "upload-1",
            fileUrl: "/api/uploads/worksheets/worksheet.png",
            activityProgress: {
                id: "progress-1",
                activityNumber: 1,
                status: "in_progress",
                student: {
                    id: "student-db-1",
                    schoolId: "school-1",
                    class: "ม.1/1",
                },
                worksheetUploads: [{ id: "upload-1" }],
            },
        });
        mocks.verifyStudentActivityAccess.mockImplementation(
            async (
                _studentId: string,
                _userId: string,
                userRole: string,
            ): Promise<{ allowed: boolean; error: string | null }> => ({
                allowed: userRole !== "class_teacher",
                error:
                    userRole === "class_teacher"
                        ? "คุณสามารถเข้าถึงข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น"
                        : null,
            }),
        );
        mocks.existsSync.mockReturnValue(false);

        const result = await deleteWorksheetUpload("upload-1");

        expect(result.success).toBe(false);
        expect(result.message).toBe(
            "คุณสามารถเข้าถึงข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น",
        );
        expect(mocks.verifyStudentActivityAccess).toHaveBeenCalledWith(
            "student-db-1",
            "teacher-1",
            "class_teacher",
            "manage",
        );
        expect(mocks.worksheetUploadDelete).not.toHaveBeenCalled();
    });
});
