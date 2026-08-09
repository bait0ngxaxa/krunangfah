import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireAuth: vi.fn(),
    activityProgressFindUnique: vi.fn(),
    phqResultFindFirst: vi.fn(),
    verifyStudentActivityAccess: vi.fn(),
    runSerializableTransaction: vi.fn(),
    revalidateAnalyticsCache: vi.fn(),
    txActivityProgressFindUnique: vi.fn(),
    txActivityProgressFindFirst: vi.fn(),
    txActivityProgressUpdate: vi.fn(),
    txActivityProgressUpdateMany: vi.fn(),
    txPhqResultFindFirst: vi.fn(),
    txWorksheetUploadCount: vi.fn(),
}));

const tx = {
    activityProgress: {
        findUnique: mocks.txActivityProgressFindUnique,
        findFirst: mocks.txActivityProgressFindFirst,
        update: mocks.txActivityProgressUpdate,
        updateMany: mocks.txActivityProgressUpdateMany,
    },
    worksheetUpload: {
        count: mocks.txWorksheetUploadCount,
    },
    phqResult: {
        findFirst: mocks.txPhqResultFindFirst,
    },
};

type SerializableCallback = (transaction: typeof tx) => Promise<unknown>;

vi.mock("@/lib/auth/session", () => ({
    requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        activityProgress: {
            findUnique: mocks.activityProgressFindUnique,
        },
        phqResult: {
            findFirst: mocks.phqResultFindFirst,
        },
    },
}));

vi.mock("@/lib/actions/activity/access", () => ({
    verifyStudentActivityAccess: mocks.verifyStudentActivityAccess,
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: mocks.revalidateAnalyticsCache,
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: vi.fn(),
}));

vi.mock("@/lib/utils/serializable-transaction", () => ({
    runSerializableTransaction: mocks.runSerializableTransaction,
}));

const {
    confirmActivityComplete,
    submitTeacherAssessment,
    updateScheduledDate,
} = await import("@/lib/actions/activity/mutations");

function mockTeacherSession(): void {
    mocks.requireAuth.mockResolvedValue({
        user: { id: "teacher-1", role: "class_teacher" },
    });
}

function mockAccessAllowed(): void {
    mocks.verifyStudentActivityAccess.mockResolvedValue({
        allowed: true,
        error: null,
    });
    mocks.phqResultFindFirst.mockResolvedValue({ id: "phq-1" });
}

describe("confirmActivityComplete teacher assessment gate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTeacherSession();
        mockAccessAllowed();
        mocks.runSerializableTransaction.mockImplementation(
            async (callback: SerializableCallback): Promise<unknown> =>
                callback(tx),
        );
        mocks.txWorksheetUploadCount.mockResolvedValue(2);
        mocks.txPhqResultFindFirst.mockResolvedValue({ id: "phq-1" });
    });

    it("returns idempotent success to an authorized caller when the activity is already completed", async () => {
        mocks.activityProgressFindUnique.mockResolvedValue({
            studentId: "student-1",
            status: "completed",
            phqResultId: "phq-1",
            activityNumber: 1,
            student: { schoolId: "school-1" },
        });

        const result = await confirmActivityComplete("cprogress1");

        expect(result).toEqual({ success: true, activityNumber: 1 });
        expect(mocks.verifyStudentActivityAccess).toHaveBeenCalledWith(
            "student-1",
            "teacher-1",
            "class_teacher",
            "manage",
        );
        expect(mocks.revalidateAnalyticsCache).toHaveBeenCalledWith(
            "school-1",
        );
        expect(mocks.runSerializableTransaction).not.toHaveBeenCalled();
    });

    it("denies an unauthorized caller before returning completed activity details or revalidating analytics", async () => {
        mocks.activityProgressFindUnique.mockResolvedValue({
            studentId: "student-1",
            status: "completed",
            phqResultId: "phq-1",
            activityNumber: 1,
            student: { schoolId: "school-1" },
        });
        mocks.verifyStudentActivityAccess.mockResolvedValue({
            allowed: false,
            error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
        });

        const result = await confirmActivityComplete("cprogress1");

        expect(result).toEqual({
            success: false,
            error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
        });
        expect(mocks.revalidateAnalyticsCache).not.toHaveBeenCalled();
        expect(mocks.runSerializableTransaction).not.toHaveBeenCalled();
    });

    it("keeps the normal activity mutation path read-only for system admins", async () => {
        mocks.requireAuth.mockResolvedValue({
            user: { id: "system-admin-1", role: "system_admin" },
        });

        const result = await confirmActivityComplete("cprogress1");

        expect(result).toEqual({
            success: false,
            error: "system_admin ไม่มีสิทธิ์แก้ไขข้อมูลกิจกรรม",
        });
        expect(mocks.activityProgressFindUnique).not.toHaveBeenCalled();
        expect(mocks.verifyStudentActivityAccess).not.toHaveBeenCalled();
        expect(mocks.revalidateAnalyticsCache).not.toHaveBeenCalled();
    });

    it("authorizes before revealing that an activity cannot accept an assessment", async () => {
        mocks.activityProgressFindUnique.mockResolvedValue({
            studentId: "student-1",
            status: "locked",
            phqResultId: "phq-1",
            activityNumber: 2,
        });
        mocks.verifyStudentActivityAccess.mockResolvedValue({
            allowed: false,
            error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
        });

        const result = await submitTeacherAssessment("cprogress1", {
            internalProblems: "ปัญหาภายใน",
            externalProblems: "ปัญหาภายนอก",
            problemType: "internal",
        });

        expect(result).toEqual({
            success: false,
            error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
        });
        expect(mocks.runSerializableTransaction).not.toHaveBeenCalled();
    });

    it("authorizes before revealing that a completed activity cannot be rescheduled", async () => {
        mocks.activityProgressFindUnique.mockResolvedValue({
            studentId: "student-1",
            status: "completed",
            phqResultId: "phq-1",
        });
        mocks.verifyStudentActivityAccess.mockResolvedValue({
            allowed: false,
            error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
        });

        const result = await updateScheduledDate(
            "cprogress1",
            "2026-06-10T00:00:00.000Z",
        );

        expect(result).toEqual({
            success: false,
            error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
        });
        expect(mocks.runSerializableTransaction).not.toHaveBeenCalled();
    });

    it("keeps activity 1 pending assessment and does not unlock activity 2 before teacher assessment is saved", async () => {
        const uploadedAt = new Date("2026-06-01T04:30:00.000Z");
        mocks.activityProgressFindUnique.mockResolvedValue({
            studentId: "student-1",
            status: "in_progress",
            phqResultId: "phq-1",
            activityNumber: 1,
            student: { schoolId: "school-1" },
        });
        mocks.txActivityProgressFindUnique.mockResolvedValue({
            id: "cprogress1",
            status: "in_progress",
            scheduledDate: null,
            studentId: "student-1",
            phqResultId: "phq-1",
            activityNumber: 1,
            assessedAt: null,
            worksheetUploads: [{ uploadedAt }],
        });

        const result = await confirmActivityComplete("cprogress1");

        expect(result).toEqual({ success: true, activityNumber: 1 });
        expect(mocks.txActivityProgressUpdate).toHaveBeenCalledWith({
            where: { id: "cprogress1" },
            data: {
                status: "pending_assessment",
                completedAt: null,
                scheduledDate: uploadedAt,
            },
        });
        expect(mocks.txActivityProgressFindFirst).not.toHaveBeenCalled();
        expect(mocks.txActivityProgressUpdateMany).not.toHaveBeenCalled();
    });

    it("does not complete an activity before its required worksheets are uploaded", async () => {
        mocks.activityProgressFindUnique.mockResolvedValue({
            studentId: "student-1",
            status: "in_progress",
            phqResultId: "phq-1",
            activityNumber: 4,
            student: { schoolId: "school-1" },
        });
        mocks.txActivityProgressFindUnique.mockResolvedValue({
            id: "cprogress1",
            status: "in_progress",
            scheduledDate: null,
            studentId: "student-1",
            phqResultId: "phq-1",
            activityNumber: 4,
            assessedAt: new Date("2026-06-01T04:30:00.000Z"),
            worksheetUploads: [],
        });
        mocks.txWorksheetUploadCount.mockResolvedValue(1);

        const result = await confirmActivityComplete("cprogress1");

        expect(result).toEqual({
            success: false,
            error: "ต้องอัปโหลดใบงานให้ครบ 2 ไฟล์ก่อนยืนยันจบกิจกรรม",
        });
        expect(mocks.txActivityProgressUpdate).not.toHaveBeenCalled();
        expect(mocks.txActivityProgressUpdateMany).not.toHaveBeenCalled();
    });

    it("does not write after the target PHQ becomes historical before the transaction", async () => {
        mocks.activityProgressFindUnique.mockResolvedValue({
            studentId: "student-1",
            status: "in_progress",
            phqResultId: "phq-1",
            activityNumber: 4,
            student: { schoolId: "school-1" },
        });
        mocks.txActivityProgressFindUnique.mockResolvedValue({
            id: "cprogress1",
            status: "in_progress",
            scheduledDate: null,
            studentId: "student-1",
            phqResultId: "phq-1",
            activityNumber: 4,
            assessedAt: new Date("2026-06-01T04:30:00.000Z"),
            worksheetUploads: [
                { uploadedAt: new Date("2026-06-01T04:30:00.000Z") },
            ],
        });
        mocks.txPhqResultFindFirst.mockResolvedValue({ id: "phq-2" });

        const result = await confirmActivityComplete("cprogress1");

        expect(result).toEqual({
            success: false,
            error: "ทำกิจกรรมได้เฉพาะผลคัดกรองล่าสุดของนักเรียน",
        });
        expect(mocks.txActivityProgressUpdate).not.toHaveBeenCalled();
        expect(mocks.txActivityProgressUpdateMany).not.toHaveBeenCalled();
    });

    it("completes activity 1 and unlocks activity 2 only after teacher assessment is submitted", async () => {
        const uploadedAt = new Date("2026-06-01T04:30:00.000Z");
        mocks.activityProgressFindUnique.mockResolvedValue({
            studentId: "student-1",
            status: "pending_assessment",
            phqResultId: "phq-1",
            activityNumber: 1,
        });
        mocks.txActivityProgressFindUnique.mockResolvedValue({
            id: "cprogress1",
            status: "pending_assessment",
            scheduledDate: null,
            studentId: "student-1",
            phqResultId: "phq-1",
            activityNumber: 1,
            worksheetUploads: [{ uploadedAt }],
        });
        mocks.txActivityProgressFindFirst.mockResolvedValue({ id: "progress-2" });

        const result = await submitTeacherAssessment("cprogress1", {
            internalProblems: "ปัญหาภายใน",
            externalProblems: "ปัญหาภายนอก",
            problemType: "internal",
        });

        expect(result).toEqual({ success: true });
        expect(mocks.txActivityProgressUpdate).toHaveBeenCalledWith({
            where: { id: "cprogress1" },
            data: expect.objectContaining({
                internalProblems: "ปัญหาภายใน",
                externalProblems: "ปัญหาภายนอก",
                problemType: "internal",
                status: "completed",
                scheduledDate: uploadedAt,
            }),
        });
        expect(mocks.txActivityProgressUpdateMany).toHaveBeenCalledWith({
            where: {
                id: "progress-2",
                status: "locked",
            },
            data: {
                status: "in_progress",
                unlockedAt: expect.any(Date),
            },
        });
    });

    it("does not complete teacher assessment before required worksheets are uploaded", async () => {
        mocks.activityProgressFindUnique.mockResolvedValue({
            studentId: "student-1",
            status: "pending_assessment",
            phqResultId: "phq-1",
            activityNumber: 1,
        });
        mocks.txActivityProgressFindUnique.mockResolvedValue({
            id: "cprogress1",
            status: "pending_assessment",
            scheduledDate: null,
            studentId: "student-1",
            phqResultId: "phq-1",
            activityNumber: 1,
            worksheetUploads: [
                { uploadedAt: new Date("2026-06-01T04:30:00.000Z") },
            ],
        });
        mocks.txWorksheetUploadCount.mockResolvedValue(1);

        const result = await submitTeacherAssessment("cprogress1", {
            internalProblems: "ปัญหาภายใน",
            externalProblems: "ปัญหาภายนอก",
            problemType: "internal",
        });

        expect(result).toEqual({
            success: false,
            error: "ต้องอัปโหลดใบงานให้ครบ 2 ไฟล์ก่อนบันทึกแบบประเมิน",
        });
        expect(mocks.txActivityProgressUpdate).not.toHaveBeenCalled();
        expect(mocks.txActivityProgressUpdateMany).not.toHaveBeenCalled();
    });
});
