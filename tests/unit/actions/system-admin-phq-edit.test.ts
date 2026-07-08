import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        phqResult: { update: vi.fn() },
        systemAdminEvent: { create: vi.fn() },
    };
    return {
        phqResultFindUnique: vi.fn(),
        phqResultFindFirst: vi.fn(),
        transaction: vi.fn(),
        tx,
    };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        phqResult: {
            findUnique: prismaMocks.phqResultFindUnique,
            findFirst: prismaMocks.phqResultFindFirst,
        },
        $transaction: prismaMocks.transaction,
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: vi.fn(),
}));

import { saveSystemPhqResult } from "@/lib/actions/system-admin/care-records-admin";
import type { Actor } from "@/lib/actions/system-admin/mutations";

const studentId = "cmstudent0000000000000001";
const phqId = "cmphq000000000000000001";
const newerTermPhqId = "cmphq000000000000000002";

const actor: Actor = {
    id: "cmadmin00000000000000001",
    email: "admin@example.com",
    name: "ผู้ดูแลระบบ",
    role: "system_admin",
};

describe("saveSystemPhqResult", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.phqResultFindUnique.mockResolvedValue(createPhqRow(phqId));
        prismaMocks.phqResultFindFirst.mockResolvedValue(createPhqRow(phqId));
        prismaMocks.tx.phqResult.update.mockResolvedValue(
            createPhqRow(phqId, {
                q1: 2,
                totalScore: 10,
                riskLevel: "yellow",
            }),
        );
    });

    it("updates the existing latest-term PHQ result instead of deleting it", async () => {
        const result = await saveSystemPhqResult(
            createInput("แก้คะแนน PHQ จากเอกสารต้นฉบับ"),
            actor,
        );

        expect(result.success).toBe(true);
        expect(result.updated?.id).toBe(phqId);
        expect(prismaMocks.tx.phqResult.update).toHaveBeenCalledWith({
            where: { id: phqId },
            data: expect.objectContaining({
                q1: 2,
                totalScore: 10,
                riskLevel: "yellow",
            }),
            select: expect.any(Object),
        });
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalled();
    });

    it("rejects editing PHQ results from older terms", async () => {
        prismaMocks.phqResultFindUnique.mockResolvedValue(
            createPhqRow(phqId, { year: 2569, semester: 1 }),
        );
        prismaMocks.phqResultFindFirst.mockResolvedValue(
            createPhqRow(newerTermPhqId, { year: 2569, semester: 2 }),
        );

        const result = await saveSystemPhqResult(
            createInput("ไม่ควรแก้ย้อนหลังข้ามเทอม"),
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "แก้ไขผล PHQ ได้เฉพาะเทอมล่าสุดของนักเรียน",
        });
        expect(prismaMocks.transaction).not.toHaveBeenCalled();
        expect(prismaMocks.tx.phqResult.update).not.toHaveBeenCalled();
    });
});

function createInput(reason: string) {
    return {
        id: phqId,
        q1: 2,
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
        referredToHospital: false,
        hospitalName: "",
        reason,
    };
}

function createPhqRow(
    id: string,
    overrides: {
        q1?: number;
        totalScore?: number;
        riskLevel?: string;
        year?: number;
        semester?: number;
    } = {},
) {
    return {
        id,
        studentId,
        academicYearId: `cmacademic${overrides.semester ?? 1}000000000001`,
        assessmentRound: 1,
        q1: overrides.q1 ?? 1,
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
        totalScore: overrides.totalScore ?? 9,
        riskLevel: overrides.riskLevel ?? "green",
        referredToHospital: false,
        hospitalName: null,
        createdAt: new Date("2026-07-07T00:00:00.000Z"),
        academicYear: {
            year: overrides.year ?? 2569,
            semester: overrides.semester ?? 1,
        },
        student: { schoolId: "cmschool0000000000000001" },
    };
}
