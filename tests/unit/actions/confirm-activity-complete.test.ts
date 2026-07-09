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
}));

const tx = {
    activityProgress: {
        findUnique: mocks.txActivityProgressFindUnique,
        findFirst: mocks.txActivityProgressFindFirst,
        update: mocks.txActivityProgressUpdate,
        updateMany: mocks.txActivityProgressUpdateMany,
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

const { confirmActivityComplete, submitTeacherAssessment } = await import(
    "@/lib/actions/activity/mutations"
);

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
});
