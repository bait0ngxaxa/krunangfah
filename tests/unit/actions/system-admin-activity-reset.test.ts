import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        worksheetUpload: { deleteMany: vi.fn(), findMany: vi.fn() },
        activityProgress: { updateMany: vi.fn(), update: vi.fn() },
        systemAdminEvent: { create: vi.fn() },
    };
    return {
        activityProgressFindUnique: vi.fn(),
        deleteFilesByUrl: vi.fn(),
        transaction: vi.fn(),
        tx,
    };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        activityProgress: { findUnique: prismaMocks.activityProgressFindUnique },
        $transaction: prismaMocks.transaction,
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    updateTag: vi.fn(),
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: vi.fn(),
}));

vi.mock("@/lib/actions/data-management/file-storage", () => ({
    deleteFilesByUrl: prismaMocks.deleteFilesByUrl,
}));

import { resetSystemActivityProgress } from "@/lib/actions/system-admin/care-records-activity-reset";

const activityId = "cmactivity000000000000001";
const studentId = "cmstudent0000000000000001";
const phqResultId = "cmphq000000000000000001";

describe("resetSystemActivityProgress", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.activityProgressFindUnique.mockResolvedValue(
            createActivityRow("completed"),
        );
        prismaMocks.tx.worksheetUpload.findMany.mockResolvedValue([
            { fileUrl: "/api/uploads/worksheets/activity-2.png" },
            { fileUrl: "/api/uploads/worksheets/activity-3.png" },
        ]);
        prismaMocks.tx.activityProgress.update.mockResolvedValue(
            createActivityRow("in_progress"),
        );
        prismaMocks.deleteFilesByUrl.mockResolvedValue([]);
    });

    it("clears selected and later activity data, then returns selected activity to in_progress", async () => {
        const result = await resetSystemActivityProgress(
            { id: activityId, reason: "ครูบันทึกกิจกรรมเกิน" },
            {
                id: "cmadmin00000000000000001",
                email: "admin@example.com",
                name: "System Admin",
                role: "system_admin",
            },
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.worksheetUpload.findMany).toHaveBeenCalledWith({
            where: {
                activityProgress: {
                    studentId,
                    phqResultId,
                    activityNumber: { gte: 2 },
                },
            },
            select: { fileUrl: true },
        });
        expect(prismaMocks.tx.worksheetUpload.deleteMany).toHaveBeenCalledWith({
            where: {
                activityProgress: {
                    studentId,
                    phqResultId,
                    activityNumber: { gte: 2 },
                },
            },
        });
        expect(prismaMocks.tx.activityProgress.updateMany).toHaveBeenCalledWith({
            where: {
                studentId,
                phqResultId,
                activityNumber: { gt: 2 },
            },
            data: expect.objectContaining({ status: "locked" }),
        });
        expect(prismaMocks.tx.activityProgress.update).toHaveBeenCalledWith({
            where: { id: activityId },
            data: expect.objectContaining({
                status: "in_progress",
                completedAt: null,
                internalProblems: null,
                externalProblems: null,
                problemType: null,
            }),
            select: expect.any(Object),
        });
        expect(prismaMocks.deleteFilesByUrl).toHaveBeenCalledWith([
            "/api/uploads/worksheets/activity-2.png",
            "/api/uploads/worksheets/activity-3.png",
        ]);
    });

    it.each(["locked", "in_progress"] as const)(
        "rejects rollback when activity status is %s",
        async (status) => {
            prismaMocks.activityProgressFindUnique.mockResolvedValue(
                createActivityRow(status),
            );

            const result = await resetSystemActivityProgress(
                { id: activityId, reason: "ไม่ควรถอยกิจกรรมที่ยังไม่เสร็จ" },
                {
                    id: "cmadmin00000000000000001",
                    email: "admin@example.com",
                    name: "System Admin",
                    role: "system_admin",
                },
            );

            expect(result).toEqual({
                success: false,
                message: "ล้างผลกิจกรรมได้เฉพาะกิจกรรมที่เสร็จแล้ว",
            });
            expect(prismaMocks.transaction).not.toHaveBeenCalled();
            expect(prismaMocks.deleteFilesByUrl).not.toHaveBeenCalled();
        },
    );

    it("does not delete worksheet files when the transaction rolls back", async () => {
        prismaMocks.tx.systemAdminEvent.create.mockRejectedValue(
            new Error("audit failed"),
        );

        await expect(
            resetSystemActivityProgress(
                { id: activityId, reason: "ทดสอบ rollback เมื่อ audit ล้ม" },
                {
                    id: "cmadmin00000000000000001",
                    email: "admin@example.com",
                    name: "System Admin",
                    role: "system_admin",
                },
            ),
        ).rejects.toThrow("audit failed");

        expect(prismaMocks.deleteFilesByUrl).not.toHaveBeenCalled();
    });
});

function createActivityRow(status: "locked" | "completed" | "in_progress") {
    return {
        id: activityId,
        studentId,
        phqResultId,
        activityNumber: 2,
        status,
        unlockedAt: new Date("2026-07-07T00:00:00.000Z"),
        scheduledDate: null,
        completedAt: status === "completed"
            ? new Date("2026-07-07T00:00:00.000Z")
            : null,
        teacherId: "cmteacher0000000000000001",
        teacherNotes: status === "completed" ? "บันทึกเดิม" : null,
        internalProblems: status === "completed" ? "กังวล" : null,
        externalProblems: null,
        problemType: status === "completed" ? "internal" : null,
        student: { schoolId: "cmschool0000000000000001" },
        teacher: null,
        phqResult: {
            assessmentRound: 1,
            academicYear: { year: 2569, semester: 1 },
        },
    };
}
