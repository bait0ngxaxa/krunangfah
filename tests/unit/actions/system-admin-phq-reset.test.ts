import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        worksheetUpload: { deleteMany: vi.fn(), findMany: vi.fn() },
        activityProgress: { deleteMany: vi.fn() },
        phqResult: { deleteMany: vi.fn(), updateMany: vi.fn() },
        systemAdminEvent: { create: vi.fn() },
    };
    return {
        phqResultFindUnique: vi.fn(),
        phqResultFindMany: vi.fn(),
        phqResultFindFirst: vi.fn(),
        deleteFilesByUrl: vi.fn(),
        transaction: vi.fn(),
        tx,
    };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        phqResult: {
            findUnique: prismaMocks.phqResultFindUnique,
            findMany: prismaMocks.phqResultFindMany,
            findFirst: prismaMocks.phqResultFindFirst,
        },
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

import { resetSystemPhqResult } from "@/lib/actions/system-admin/care-records-phq-reset";

const studentId = "cmstudent0000000000000001";
const academicYearId = "cmacademic0000000000001";
const nextAcademicYearId = "cmacademic0000000000002";
const phqRound1Id = "cmphq000000000000000001";
const phqRound2Id = "cmphq000000000000000002";
const phqNextTermId = "cmphq000000000000000003";

describe("resetSystemPhqResult", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.phqResultFindUnique.mockResolvedValue(createPhqRow(phqRound1Id, 1));
        prismaMocks.phqResultFindFirst.mockResolvedValue(createPhqRow(phqRound2Id, 2));
        prismaMocks.tx.worksheetUpload.findMany.mockResolvedValue([
            { fileUrl: "/api/uploads/worksheets/phq-round-1.png" },
        ]);
        prismaMocks.deleteFilesByUrl.mockResolvedValue([]);
        prismaMocks.tx.phqResult.updateMany.mockResolvedValue({ count: 1 });
    });

    it("deletes only the selected PHQ round so teachers can redo that round", async () => {
        const result = await resetSystemPhqResult(
            { id: phqRound1Id, expectedUpdatedAt, reason: "ครูนำเข้าคะแนน PHQ ผิดรอบ" },
            {
                id: "cmadmin00000000000000001",
                email: "admin@example.com",
                name: "System Admin",
                role: "system_admin",
            },
        );

        expect(result.success).toBe(true);
        expect(result.updated?.deletedPhqIds).toEqual([phqRound1Id]);
        expect(prismaMocks.phqResultFindMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.worksheetUpload.deleteMany).toHaveBeenCalledWith({
            where: {
                activityProgress: {
                    phqResultId: { in: [phqRound1Id] },
                },
            },
        });
        expect(prismaMocks.tx.worksheetUpload.findMany).toHaveBeenCalledWith({
            where: {
                activityProgress: {
                    phqResultId: { in: [phqRound1Id] },
                },
            },
            select: { fileUrl: true },
        });
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalledWith({
            where: { phqResultId: { in: [phqRound1Id] } },
        });
        expect(prismaMocks.tx.phqResult.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: [phqRound1Id] } },
        });
        expect(prismaMocks.deleteFilesByUrl).toHaveBeenCalledWith([
            "/api/uploads/worksheets/phq-round-1.png",
        ]);
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: "RESET",
                targetType: "phqResult",
                targetId: phqRound1Id,
                reason: "ครูนำเข้าคะแนน PHQ ผิดรอบ",
            }),
        });
    });

    it("rejects rollback for an old term when a newer PHQ term exists", async () => {
        prismaMocks.phqResultFindUnique.mockResolvedValue(
            createPhqRow(phqRound1Id, 1, { year: 2569, semester: 1 }),
        );
        prismaMocks.phqResultFindFirst.mockResolvedValue(
            createPhqRow(phqNextTermId, 1, {
                academicYearId: nextAcademicYearId,
                year: 2569,
                semester: 2,
            }),
        );

        const result = await resetSystemPhqResult(
            { id: phqRound1Id, expectedUpdatedAt, reason: "ไม่ควรล้างผลย้อนหลังข้ามเทอม" },
            {
                id: "cmadmin00000000000000001",
                email: "admin@example.com",
                name: "System Admin",
                role: "system_admin",
            },
        );

        expect(result).toEqual({
            success: false,
            message: "ล้างผล PHQ ได้เฉพาะเทอมล่าสุดของนักเรียน",
        });
        expect(prismaMocks.phqResultFindMany).not.toHaveBeenCalled();
        expect(prismaMocks.transaction).not.toHaveBeenCalled();
        expect(prismaMocks.deleteFilesByUrl).not.toHaveBeenCalled();
    });

    it("does not delete worksheet files when the transaction rolls back", async () => {
        prismaMocks.tx.systemAdminEvent.create.mockRejectedValue(
            new Error("audit failed"),
        );

        await expect(
            resetSystemPhqResult(
                { id: phqRound1Id, expectedUpdatedAt, reason: "ทดสอบ rollback เมื่อ audit ล้ม" },
                {
                    id: "cmadmin00000000000000001",
                    email: "admin@example.com",
                    name: "System Admin",
                    role: "system_admin",
                },
            ),
        ).rejects.toThrow("audit failed");

        expect(prismaMocks.tx.phqResult.deleteMany).not.toHaveBeenCalled();
        expect(prismaMocks.deleteFilesByUrl).not.toHaveBeenCalled();
    });
});

function createPhqRow(
    id: string,
    assessmentRound: number,
    overrides: {
        academicYearId?: string;
        year?: number;
        semester?: number;
    } = {},
) {
    return {
        id,
        studentId,
        academicYearId: overrides.academicYearId ?? academicYearId,
        assessmentRound,
        q1: 1,
        q2: 1,
        q3: 1,
        q4: 1,
        q5: 1,
        q6: 1,
        q7: 1,
        q8: 1,
        q9: 1,
        q9a: false,
        q9b: false,
        totalScore: 9,
        riskLevel: "GREEN",
        referredToHospital: false,
        hospitalName: null,
        createdAt: new Date("2026-07-07T00:00:00.000Z"),
        updatedAt: expectedUpdatedAt,
        academicYear: {
            year: overrides.year ?? 2569,
            semester: overrides.semester ?? 1,
        },
        student: { schoolId: "cmschool0000000000000001" },
    };
}

const expectedUpdatedAt = new Date("2026-07-07T00:00:00.000Z");
