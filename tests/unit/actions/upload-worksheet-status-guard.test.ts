import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireAuth: vi.fn(),
    activityProgressFindUnique: vi.fn(),
    transaction: vi.fn(),
    txActivityProgressFindUnique: vi.fn(),
    txActivityProgressUpdateMany: vi.fn(),
    txWorksheetUploadFindMany: vi.fn(),
    txWorksheetUploadFindUnique: vi.fn(),
    txWorksheetUploadCreate: vi.fn(),
    txWorksheetUploadCount: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    existsSync: vi.fn(),
    compressWorksheetImageBuffer: vi.fn(),
    verifyStudentActivityAccess: vi.fn(),
    acquireRedisLock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        activityProgress: { findUnique: mocks.activityProgressFindUnique },
        $transaction: mocks.transaction,
    },
}));

vi.mock("fs/promises", () => ({
    mkdir: mocks.mkdir,
    writeFile: mocks.writeFile,
    unlink: mocks.unlink,
}));

vi.mock("fs", () => ({ existsSync: mocks.existsSync }));

vi.mock("@/lib/utils/server-image-compression", () => ({
    compressWorksheetImageBuffer: mocks.compressWorksheetImageBuffer,
    isSupportedWorksheetImageExtension: vi.fn(() => true),
}));

vi.mock("@/lib/actions/activity/access", () => ({
    verifyStudentActivityAccess: mocks.verifyStudentActivityAccess,
}));

vi.mock("@/lib/actions/care-record-current-policy", () => ({
    canMutatePhqContext: vi.fn(async () => true),
}));

vi.mock("@/lib/cache/redis-lock", () => ({
    acquireRedisLock: mocks.acquireRedisLock,
    releaseRedisLock: vi.fn(),
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

vi.mock("@/lib/utils/logging", () => ({ logError: vi.fn() }));

const { uploadWorksheet } = await import("@/lib/actions/activity/file-utils");

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const LOCKED_MESSAGE = "กิจกรรมนี้ยังไม่เปิดให้ทำ กรุณารีเฟรชหน้าแล้วลองใหม่";
const SUBMITTED_MESSAGE = "กิจกรรมนี้ส่งใบงานครบแล้ว กรุณารีเฟรชหน้าแล้วลองใหม่";

function createWorksheetFormData(): FormData {
    const formData = new FormData();
    formData.set("file", new File([new Uint8Array(PNG_BYTES)], "worksheet.png", { type: "image/png" }));
    formData.set("uploadRequestId", "00000000-0000-4000-8000-000000000002");
    return formData;
}

function mockActivity(status: string, uploadCount: number, activityNumber = 3): void {
    mocks.activityProgressFindUnique.mockResolvedValue({
        id: "progress-3",
        studentId: "student-1",
        phqResultId: "phq-1",
        activityNumber,
        status,
        teacherId: "teacher-1",
        phqResult: { assessmentRound: 1 },
        student: { id: "student-1", schoolId: "school-1", class: "ม.1/1" },
        worksheetUploads: Array.from({ length: uploadCount }, (_, index) => ({
            id: `upload-${index + 1}`,
            worksheetNumber: index + 1,
        })),
    });
}

function mockTransactionActivity(status: string, uploadCount: number): void {
    mocks.txActivityProgressFindUnique.mockResolvedValue({
        id: "progress-3",
        studentId: "student-1",
        phqResultId: "phq-1",
        activityNumber: 3,
        status,
        phqResult: { assessmentRound: 1 },
    });
    mocks.txWorksheetUploadFindMany.mockResolvedValue(
        Array.from({ length: uploadCount }, (_, index) => ({ worksheetNumber: index + 1 })),
    );
}

function expectNoFileProcessing(): void {
    expect(mocks.compressWorksheetImageBuffer).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.txWorksheetUploadCreate).not.toHaveBeenCalled();
}

describe("uploadWorksheet activity status guard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuth.mockResolvedValue({ user: { id: "teacher-1", role: "class_teacher" } });
        mocks.verifyStudentActivityAccess.mockResolvedValue({ allowed: true, error: null });
        mocks.acquireRedisLock.mockResolvedValue({ status: "unavailable", reason: "client_unavailable" });
        mocks.compressWorksheetImageBuffer.mockResolvedValue({
            buffer: Buffer.from(PNG_BYTES),
            extension: "png",
            mimeType: "image/png",
        });
        mocks.existsSync.mockReturnValue(true);
        mocks.writeFile.mockResolvedValue(undefined);
        mocks.unlink.mockResolvedValue(undefined);
        mocks.txWorksheetUploadFindUnique.mockResolvedValue(null);
        mocks.txWorksheetUploadCreate.mockResolvedValue({ id: "upload-new" });
        mocks.txWorksheetUploadCount.mockResolvedValue(1);
        mocks.txActivityProgressUpdateMany.mockResolvedValue({ count: 0 });
        mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
            callback({
                activityProgress: {
                    findUnique: mocks.txActivityProgressFindUnique,
                    updateMany: mocks.txActivityProgressUpdateMany,
                },
                worksheetUpload: {
                    findMany: mocks.txWorksheetUploadFindMany,
                    findUnique: mocks.txWorksheetUploadFindUnique,
                    create: mocks.txWorksheetUploadCreate,
                    count: mocks.txWorksheetUploadCount,
                },
            }),
        );
        mockTransactionActivity("in_progress", 0);
    });

    it("rejects a locked activity before processing the file", async () => {
        mockActivity("locked", 0);

        const result = await uploadWorksheet("progress-3", createWorksheetFormData());

        expect(result).toEqual({
            success: false,
            message: LOCKED_MESSAGE,
            error: "UPLOAD_ACTIVITY_LOCKED",
            retryable: false,
            refreshRequired: true,
        });
        expectNoFileProcessing();
    });

    it.each(["completed", "pending_assessment"])("rejects a %s activity", async (status) => {
        mockActivity(status, 2);

        const result = await uploadWorksheet("progress-3", createWorksheetFormData());

        expect(result).toMatchObject({
            success: false,
            message: SUBMITTED_MESSAGE,
            error: "UPLOAD_ACTIVITY_COMPLETED",
            retryable: false,
            refreshRequired: true,
        });
        expectNoFileProcessing();
    });

    it("rejects an upload beyond the required worksheet count", async () => {
        mockActivity("in_progress", 2);

        const result = await uploadWorksheet("progress-3", createWorksheetFormData());

        expect(result).toMatchObject({
            success: false,
            message: "อัปโหลดใบงานครบ 2 ไฟล์แล้ว หากต้องการเปลี่ยนไฟล์ให้ลบไฟล์เดิมก่อน",
            error: "UPLOAD_LIMIT_REACHED",
            retryable: false,
        });
        expectNoFileProcessing();
    });

    it("uses the activity's own requirement for the cap", async () => {
        mockActivity("in_progress", 1, 5);

        const result = await uploadWorksheet("progress-3", createWorksheetFormData());

        expect(result.error).toBe("UPLOAD_LIMIT_REACHED");
        expect(result.message).toContain("ครบ 1 ไฟล์");
    });

    it("re-checks status inside the transaction and unlinks the written file", async () => {
        mockActivity("in_progress", 0);
        mockTransactionActivity("locked", 0);

        const result = await uploadWorksheet("progress-3", createWorksheetFormData());

        expect(result).toMatchObject({
            success: false,
            message: LOCKED_MESSAGE,
            error: "UPLOAD_ACTIVITY_LOCKED",
            retryable: false,
            refreshRequired: true,
        });
        expect(mocks.writeFile).toHaveBeenCalledOnce();
        expect(mocks.txWorksheetUploadCreate).not.toHaveBeenCalled();
        expect(mocks.unlink).toHaveBeenCalledWith(mocks.writeFile.mock.calls[0]?.[0]);
    });

    it("re-checks the cap inside the transaction against a concurrent upload", async () => {
        mockActivity("in_progress", 1);
        mockTransactionActivity("in_progress", 2);

        const result = await uploadWorksheet("progress-3", createWorksheetFormData());

        expect(result.error).toBe("UPLOAD_LIMIT_REACHED");
        expect(mocks.txWorksheetUploadCreate).not.toHaveBeenCalled();
        expect(mocks.unlink).toHaveBeenCalledWith(mocks.writeFile.mock.calls[0]?.[0]);
    });

    it("accepts an in-progress activity below the cap", async () => {
        mockActivity("in_progress", 1);
        mockTransactionActivity("in_progress", 1);
        mocks.txWorksheetUploadCount.mockResolvedValue(2);

        const result = await uploadWorksheet("progress-3", createWorksheetFormData());

        expect(result).toMatchObject({
            success: true,
            worksheet: { id: "upload-new", worksheetNumber: 2 },
            uploadedCount: 2,
            requiredCount: 2,
            allUploaded: true,
        });
        expect(mocks.unlink).not.toHaveBeenCalled();
    });

    it("still answers an idempotent retry after the cap is reached", async () => {
        mockActivity("in_progress", 2);
        mocks.txWorksheetUploadFindUnique.mockResolvedValue({
            id: "upload-2",
            activityProgressId: "progress-3",
            worksheetNumber: 2,
            fileUrl: "/api/uploads/worksheets/existing.png",
            uploadedById: "teacher-1",
            activityProgress: {
                activityNumber: 3,
                studentId: "student-1",
                phqResultId: "phq-1",
                phqResult: { assessmentRound: 1 },
            },
        });
        mocks.txWorksheetUploadCount.mockResolvedValue(2);

        const result = await uploadWorksheet("progress-3", createWorksheetFormData());

        expect(result).toMatchObject({ success: true, worksheet: { id: "upload-2" } });
        expectNoFileProcessing();
    });
});
