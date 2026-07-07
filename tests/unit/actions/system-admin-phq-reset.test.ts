import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        worksheetUpload: { deleteMany: vi.fn() },
        activityProgress: { deleteMany: vi.fn() },
        phqResult: { deleteMany: vi.fn() },
        systemAdminEvent: { create: vi.fn() },
    };
    return {
        phqResultFindUnique: vi.fn(),
        phqResultFindMany: vi.fn(),
        transaction: vi.fn(),
        tx,
    };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        phqResult: {
            findUnique: prismaMocks.phqResultFindUnique,
            findMany: prismaMocks.phqResultFindMany,
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

import { resetSystemPhqResult } from "@/lib/actions/system-admin/care-records-phq-reset";

const studentId = "cmstudent0000000000000001";
const academicYearId = "cmacademic0000000000001";
const phqRound1Id = "cmphq000000000000000001";
const phqRound2Id = "cmphq000000000000000002";

describe("resetSystemPhqResult", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.phqResultFindUnique.mockResolvedValue(createPhqRow(phqRound1Id, 1));
        prismaMocks.phqResultFindMany.mockResolvedValue([
            createPhqRow(phqRound1Id, 1),
            createPhqRow(phqRound2Id, 2),
        ]);
    });

    it("deletes selected and later PHQ data so teachers can redo the round", async () => {
        const result = await resetSystemPhqResult(
            { id: phqRound1Id, reason: "ครูนำเข้าคะแนน PHQ ผิดรอบ" },
            {
                id: "cmadmin00000000000000001",
                email: "admin@example.com",
                name: "System Admin",
                role: "system_admin",
            },
        );

        expect(result.success).toBe(true);
        expect(result.updated?.deletedPhqIds).toEqual([phqRound1Id, phqRound2Id]);
        expect(prismaMocks.phqResultFindMany).toHaveBeenCalledWith({
            where: {
                studentId,
                academicYearId,
                assessmentRound: { gte: 1 },
            },
            select: expect.any(Object),
            orderBy: { assessmentRound: "asc" },
        });
        expect(prismaMocks.tx.worksheetUpload.deleteMany).toHaveBeenCalledWith({
            where: {
                activityProgress: {
                    phqResultId: { in: [phqRound1Id, phqRound2Id] },
                },
            },
        });
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalledWith({
            where: { phqResultId: { in: [phqRound1Id, phqRound2Id] } },
        });
        expect(prismaMocks.tx.phqResult.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: [phqRound1Id, phqRound2Id] } },
        });
    });
});

function createPhqRow(id: string, assessmentRound: number) {
    return {
        id,
        studentId,
        academicYearId,
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
        academicYear: { year: 2569, semester: 1 },
        student: { schoolId: "cmschool0000000000000001" },
    };
}
