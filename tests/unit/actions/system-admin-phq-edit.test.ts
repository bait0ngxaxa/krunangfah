import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        phqResult: {
            updateMany: vi.fn(),
            findFirst: vi.fn(),
            findUniqueOrThrow: vi.fn(),
        },
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
        prismaMocks.tx.phqResult.findFirst.mockResolvedValue(createPhqRow(phqId));
        prismaMocks.tx.phqResult.updateMany.mockResolvedValue({ count: 1 });
        prismaMocks.tx.phqResult.findUniqueOrThrow.mockResolvedValue(
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
        expect(prismaMocks.tx.phqResult.updateMany).toHaveBeenCalledWith({
            where: { id: phqId, updatedAt: expectedUpdatedAt },
            data: expect.objectContaining({
                q1: 2,
                totalScore: 10,
                riskLevel: "yellow",
            }),
        });
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalled();
    });

    it("rejects editing PHQ results from older terms", async () => {
        prismaMocks.phqResultFindUnique.mockResolvedValue(
            createPhqRow(phqId, { year: 2569, semester: 1 }),
        );
        prismaMocks.tx.phqResult.findFirst.mockResolvedValue(
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
        expect(prismaMocks.transaction).toHaveBeenCalledOnce();
        expect(prismaMocks.tx.phqResult.updateMany).not.toHaveBeenCalled();
    });

    it("rejects editing when a newer PHQ term appears before the transaction", async () => {
        prismaMocks.tx.phqResult.findFirst.mockResolvedValue(
            createPhqRow(newerTermPhqId, { year: 2569, semester: 2 }),
        );

        const result = await saveSystemPhqResult(
            createInput("ไม่ควรแก้ผลเดิมหลังมีข้อมูลเทอมใหม่"),
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "แก้ไขผล PHQ ได้เฉพาะเทอมล่าสุดของนักเรียน",
        });
        expect(prismaMocks.tx.phqResult.updateMany).not.toHaveBeenCalled();
        expect(prismaMocks.transaction).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({ isolationLevel: "Serializable" }),
        );
    });

    it("rejects hospital referral edits when the edited PHQ score is not red", async () => {
        const result = await saveSystemPhqResult(
            createInput("แก้ข้อมูลส่งต่อโรงพยาบาล", {
                referredToHospital: true,
                hospitalName: "โรงพยาบาลทดสอบ",
            }),
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "แก้ไขการส่งต่อโรงพยาบาลได้เฉพาะ PHQ สีแดง (เสี่ยงสูงมาก)",
        });
        expect(prismaMocks.transaction).not.toHaveBeenCalled();
        expect(prismaMocks.tx.phqResult.updateMany).not.toHaveBeenCalled();
    });

    it("allows hospital referral edits when the edited PHQ score is red", async () => {
        prismaMocks.tx.phqResult.findUniqueOrThrow.mockResolvedValue(
            createPhqRow(phqId, {
                q1: 3,
                totalScore: 20,
                riskLevel: "red",
                referredToHospital: true,
                hospitalName: "โรงพยาบาลทดสอบ",
            }),
        );

        const result = await saveSystemPhqResult(
            createInput("แก้ข้อมูลส่งต่อโรงพยาบาล", {
                q1: 3,
                q2: 3,
                q3: 3,
                q4: 3,
                q5: 3,
                q6: 3,
                q7: 0,
                referredToHospital: true,
                hospitalName: "โรงพยาบาลทดสอบ",
            }),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.phqResult.updateMany).toHaveBeenCalledWith({
            where: { id: phqId, updatedAt: expectedUpdatedAt },
            data: expect.objectContaining({
                totalScore: 20,
                riskLevel: "red",
                referredToHospital: true,
                hospitalName: "โรงพยาบาลทดสอบ",
            }),
        });
    });
});

function createInput(
    reason: string,
    overrides: Partial<ReturnType<typeof createBaseInput>> = {},
) {
    return { ...createBaseInput(reason), ...overrides };
}

function createBaseInput(reason: string) {
    return {
        id: phqId,
        expectedUpdatedAt,
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
        referredToHospital?: boolean;
        hospitalName?: string | null;
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
        referredToHospital: overrides.referredToHospital ?? false,
        hospitalName: overrides.hospitalName ?? null,
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
