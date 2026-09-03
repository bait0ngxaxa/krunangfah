import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        phqResult: {
            updateMany: vi.fn(),
            findFirst: vi.fn(),
            findUniqueOrThrow: vi.fn(),
        },
        activityProgress: {
            createMany: vi.fn(),
            findMany: vi.fn(),
            updateMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        systemAdminEvent: { create: vi.fn(), findMany: vi.fn() },
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
import { getActivityIndices } from "@/lib/actions/activity/constants";

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
        prismaMocks.tx.activityProgress.findMany.mockResolvedValue([]);
        prismaMocks.tx.systemAdminEvent.findMany.mockResolvedValue([]);
        prismaMocks.tx.activityProgress.createMany.mockResolvedValue({ count: 4 });
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
        expect(prismaMocks.tx.activityProgress.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ activityNumber: 1, status: "in_progress" }),
                expect.objectContaining({ activityNumber: 2, status: "locked" }),
                expect.objectContaining({ activityNumber: 3, status: "locked" }),
                expect.objectContaining({ activityNumber: 5, status: "locked" }),
            ]),
        });
        expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalled();
    });

    it("updates a round 2 risk without creating activity progress", async () => {
        prismaMocks.phqResultFindUnique.mockResolvedValue(
            createPhqRow(phqId, { assessmentRound: 2 }),
        );
        prismaMocks.phqResultFindFirst.mockResolvedValue(
            createPhqRow(phqId, { assessmentRound: 2 }),
        );
        prismaMocks.tx.phqResult.findFirst.mockResolvedValue(
            createPhqRow(phqId, { assessmentRound: 2 }),
        );
        prismaMocks.tx.phqResult.findUniqueOrThrow.mockResolvedValue(
            createPhqRow(phqId, {
                assessmentRound: 2,
                q1: 2,
                totalScore: 10,
                riskLevel: "yellow",
            }),
        );

        const result = await saveSystemPhqResult(
            createInput("แก้คะแนนผลคัดกรองครั้งที่ 2"),
            actor,
        );

        expect(result.success).toBe(true);
        expect(result.updated?.assessmentRound).toBe(2);
        expect(prismaMocks.tx.activityProgress.createMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.updateMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
    });

    it("reconciles a pristine green sequence to yellow", async () => {
        configureRiskTransition("green", "yellow");

        const result = await saveSystemPhqResult(
            createRiskInput("แก้ระดับความเสี่ยงเป็นสีเหลือง", "yellow"),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalledWith({
            where: expect.objectContaining({
                studentId,
                phqResultId: phqId,
                activityNumber: { in: [1, 2, 5] },
                worksheetUploads: { none: {} },
            }),
        });
        expect(prismaMocks.tx.activityProgress.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ activityNumber: 1, status: "in_progress" }),
                expect.objectContaining({ activityNumber: 2, status: "locked" }),
                expect.objectContaining({ activityNumber: 3, status: "locked" }),
                expect.objectContaining({ activityNumber: 5, status: "locked" }),
            ]),
        });
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                changes: expect.arrayContaining([
                    {
                        field: "activitySequence",
                        label: "ชุดกิจกรรมตามระดับความเสี่ยง",
                        before: "1, 2, 5",
                        after: "1, 2, 3, 5",
                    },
                ]),
            }),
        });
    });

    it("reconciles a pristine yellow sequence to orange", async () => {
        configureRiskTransition("yellow", "orange");

        const result = await saveSystemPhqResult(
            createRiskInput("แก้ระดับความเสี่ยงเป็นสีส้ม", "orange"),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ activityNumber: 1, status: "in_progress" }),
                expect.objectContaining({ activityNumber: 2, status: "locked" }),
                expect.objectContaining({ activityNumber: 3, status: "locked" }),
                expect.objectContaining({ activityNumber: 4, status: "locked" }),
                expect.objectContaining({ activityNumber: 5, status: "locked" }),
            ]),
        });
    });

    it("reconciles a pristine orange sequence to green", async () => {
        configureRiskTransition("orange", "green");

        const result = await saveSystemPhqResult(
            createRiskInput("แก้ระดับความเสี่ยงเป็นสีเขียว", "green"),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.activityProgress.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ activityNumber: 1, status: "in_progress" }),
                expect.objectContaining({ activityNumber: 2, status: "locked" }),
                expect.objectContaining({ activityNumber: 5, status: "locked" }),
            ]),
        });
        const created = prismaMocks.tx.activityProgress.createMany.mock.calls[0]?.[0];
        expect(created?.data).toHaveLength(3);
    });

    it("removes a pristine green sequence when the new risk has no activities", async () => {
        configureRiskTransition("green", "red");

        const result = await saveSystemPhqResult(
            createRiskInput("แก้ระดับความเสี่ยงเป็นสีแดง", "red"),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.createMany).not.toHaveBeenCalled();
    });

    it("initializes a new sequence when a no-activity risk has no rows", async () => {
        configureRiskTransition("red", "orange");

        const result = await saveSystemPhqResult(
            createRiskInput("แก้ระดับความเสี่ยงเป็นสีส้ม", "orange"),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.createMany).toHaveBeenCalled();
    });

    it("does not touch activities when the risk sequence is unchanged", async () => {
        const existing = createPhqRow(phqId, {
            q1: 0,
            totalScore: 8,
            riskLevel: "green",
        });
        prismaMocks.phqResultFindUnique.mockResolvedValue(existing);
        prismaMocks.tx.phqResult.findFirst.mockResolvedValue(existing);
        prismaMocks.tx.phqResult.findUniqueOrThrow.mockResolvedValue(
            createPhqRow(phqId, { q1: 1, totalScore: 9, riskLevel: "green" }),
        );

        const result = await saveSystemPhqResult(
            createRiskInput("แก้คะแนนแต่ยังอยู่ในกลุ่มกิจกรรมเดิม", "green"),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.activityProgress.findMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.createMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.updateMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
    });

    it("does not reconcile a no-activity to no-activity risk edit", async () => {
        configureRiskTransition("blue", "red");

        const result = await saveSystemPhqResult(
            createRiskInput("แก้ระดับความเสี่ยงจากสีน้ำเงินเป็นสีแดง", "red"),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.activityProgress.findMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.createMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.updateMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
    });

    it.each([
        ["worksheet upload", (rows: TestActivityRow[]) => {
            firstActivity(rows)._count.worksheetUploads = 1;
        }],
        ["teacher notes", (rows: TestActivityRow[]) => {
            firstActivity(rows).teacherNotes = "บันทึกของครู";
        }],
        ["teacher assignment", (rows: TestActivityRow[]) => {
            firstActivity(rows).teacherId = "cmteacher0000000000000001";
        }],
        ["teacher snapshot", (rows: TestActivityRow[]) => {
            firstActivity(rows).teacherSnapshot = { id: "cmteacher0000000000000001" };
        }],
        ["scheduled date", (rows: TestActivityRow[]) => {
            firstActivity(rows).scheduledDate = activityDate;
        }],
        ["assessment data", (rows: TestActivityRow[]) => {
            firstActivity(rows).internalProblems = "ปัญหาภายใน";
        }],
        ["problem type", (rows: TestActivityRow[]) => {
            firstActivity(rows).problemType = "internal";
        }],
        ["assessed at", (rows: TestActivityRow[]) => {
            firstActivity(rows).assessedAt = activityDate;
        }],
        ["completed activity", (rows: TestActivityRow[]) => {
            firstActivity(rows).status = "completed";
            firstActivity(rows).completedAt = activityDate;
        }],
        ["progressed later activity", (rows: TestActivityRow[]) => {
            const later = rows[1];
            if (!later) throw new Error("Expected a later activity");
            later.status = "in_progress";
            later.unlockedAt = activityDate;
        }],
    ] as Array<[string, (rows: TestActivityRow[]) => void]>)
        ("rejects a risk-changing edit when %s evidence exists", (_label, mutate) => {
            const rows = configureRiskTransition("green", "yellow");
            mutate(rows);
            prismaMocks.tx.activityProgress.findMany.mockResolvedValue(rows);

            return saveSystemPhqResult(
                createRiskInput("ป้องกันการลบประวัติกิจกรรม", "yellow"),
                actor,
            ).then((result) => {
                expect(result).toEqual({
                    success: false,
                    message: "ไม่สามารถเปลี่ยนระดับความเสี่ยงได้ เนื่องจากมีกิจกรรมที่เริ่มใช้งานแล้ว เพื่อป้องกันข้อมูลกิจกรรมสูญหาย",
                });
                expect(prismaMocks.tx.phqResult.updateMany).not.toHaveBeenCalled();
                expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
                expect(prismaMocks.tx.activityProgress.createMany).not.toHaveBeenCalled();
                expect(prismaMocks.tx.systemAdminEvent.create).not.toHaveBeenCalled();
            });
        });

    it("rejects a sequence referenced by System Admin history", async () => {
        const rows = configureRiskTransition("green", "yellow");
        const first = firstActivity(rows);
        prismaMocks.tx.systemAdminEvent.findMany.mockResolvedValue([
            { targetId: first.id },
        ]);

        const result = await saveSystemPhqResult(
            createRiskInput("รักษาประวัติกิจกรรมที่มี audit", "yellow"),
            actor,
        );

        expect(result.success).toBe(false);
        expect(prismaMocks.tx.phqResult.updateMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
    });

    it.each([
        ["missing activity", (rows: TestActivityRow[]) => rows.splice(1, 1)],
        ["unexpected activity", (rows: TestActivityRow[]) => {
            rows.push(createActivityRow(3, 2));
            rows.sort((left, right) => left.activityNumber - right.activityNumber);
        }],
    ] as Array<[string, (rows: TestActivityRow[]) => void]>)
        ("rejects a malformed old activity sequence: %s", (_label, mutate) => {
            const rows = configureRiskTransition("green", "yellow");
            mutate(rows);
            prismaMocks.tx.activityProgress.findMany.mockResolvedValue(rows);

            return saveSystemPhqResult(
                createRiskInput("ไม่ซ่อมแซมลำดับกิจกรรมที่กำกวม", "yellow"),
                actor,
            ).then((result) => {
                expect(result.success).toBe(false);
                expect(prismaMocks.tx.phqResult.updateMany).not.toHaveBeenCalled();
                expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
                expect(prismaMocks.tx.activityProgress.createMany).not.toHaveBeenCalled();
            });
        });

    it("rejects unexpected activity rows for an old no-activity risk", async () => {
        const rows = configureRiskTransition("red", "orange", [
            createActivityRow(1, 0),
        ]);

        const result = await saveSystemPhqResult(
            createRiskInput("ไม่ลบกิจกรรมประวัติที่ไม่คาดหมาย", "orange"),
            actor,
        );

        expect(result.success).toBe(false);
        expect(prismaMocks.tx.phqResult.updateMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
        expect(rows).toHaveLength(1);
    });

    it("rolls back when the safe delete count is unexpected", async () => {
        configureRiskTransition("green", "yellow");
        prismaMocks.tx.activityProgress.deleteMany.mockResolvedValue({ count: 2 });

        await expect(
            saveSystemPhqResult(
                createRiskInput("ทดสอบความสอดคล้องของจำนวนแถว", "yellow"),
                actor,
            ),
        ).rejects.toThrow("unexpected number of rows");
        expect(prismaMocks.tx.activityProgress.createMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.systemAdminEvent.create).not.toHaveBeenCalled();
    });

    it("does not reconcile activities when the PHQ claim is stale", async () => {
        configureRiskTransition("green", "yellow");
        prismaMocks.tx.activityProgress.findMany.mockResolvedValue([]);
        prismaMocks.tx.phqResult.updateMany.mockResolvedValue({ count: 0 });

        const result = await saveSystemPhqResult(
            createRiskInput("ข้อมูล PHQ เก่าเกินไป", "yellow"),
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดและลองใหม่",
        });
        expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.activityProgress.createMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.systemAdminEvent.create).not.toHaveBeenCalled();
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
            message: "แก้ไขข้อมูลได้เฉพาะผลคัดกรองล่าสุดของนักเรียน",
        });
        expect(prismaMocks.transaction).toHaveBeenCalledOnce();
        expect(prismaMocks.tx.phqResult.updateMany).not.toHaveBeenCalled();
    });

    it("rejects editing an older PHQ round in the latest term", async () => {
        prismaMocks.phqResultFindUnique.mockResolvedValue(
            createPhqRow(phqId, { assessmentRound: 1 }),
        );
        prismaMocks.tx.phqResult.findFirst.mockResolvedValue(
            createPhqRow(newerTermPhqId, { assessmentRound: 2 }),
        );

        const result = await saveSystemPhqResult(
            createInput("ไม่ควรแก้ผลรอบก่อนหน้า"),
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "แก้ไขข้อมูลได้เฉพาะผลคัดกรองล่าสุดของนักเรียน",
        });
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
            message: "แก้ไขข้อมูลได้เฉพาะผลคัดกรองล่าสุดของนักเรียน",
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

type TestRisk = "blue" | "green" | "yellow" | "orange" | "red";
type TestActivityRow = {
    id: string;
    studentId: string;
    phqResultId: string;
    activityNumber: number;
    status: string;
    unlockedAt: Date | null;
    completedAt: Date | null;
    scheduledDate: Date | null;
    teacherId: string | null;
    teacherSnapshot: Record<string, string> | null;
    teacherNotes: string | null;
    internalProblems: string | null;
    externalProblems: string | null;
    problemType: string | null;
    assessedAt: Date | null;
    _count: { worksheetUploads: number };
};

const activityDate = new Date("2026-08-01T00:00:00.000Z");

function configureRiskTransition(
    oldRisk: TestRisk,
    newRisk: TestRisk,
    rows = createActivityRows(oldRisk),
): TestActivityRow[] {
    const existing = createPhqRow(phqId, {
        totalScore: scoreForRisk(oldRisk),
        riskLevel: oldRisk,
    });
    prismaMocks.phqResultFindUnique.mockResolvedValue(existing);
    prismaMocks.tx.phqResult.findFirst.mockResolvedValue(existing);
    prismaMocks.tx.activityProgress.findMany.mockResolvedValue(rows);
    prismaMocks.tx.activityProgress.deleteMany.mockResolvedValue({
        count: rows.length,
    });
    prismaMocks.tx.activityProgress.createMany.mockResolvedValue({
        count: getActivityIndices(newRisk).length,
    });
    prismaMocks.tx.phqResult.findUniqueOrThrow.mockResolvedValue(
        createPhqRow(phqId, {
            totalScore: scoreForRisk(newRisk),
            riskLevel: newRisk,
        }),
    );
    return rows;
}

function createRiskInput(reason: string, risk: TestRisk) {
    const scores = {
        blue: 0,
        green: 1,
        yellow: 1,
        orange: 2,
        red: 1,
    }[risk];
    const input = createInput(reason, {
        q1: risk === "yellow" ? 2 : scores,
        q2: scores,
        q3: scores,
        q4: scores,
        q5: scores,
        q6: scores,
        q7: scores,
        q8: scores,
        q9: scores,
        q9a: risk === "red",
        q9b: false,
    });
    return input;
}

function scoreForRisk(risk: TestRisk): number {
    if (risk === "blue") return 0;
    if (risk === "green") return 9;
    if (risk === "yellow") return 10;
    if (risk === "orange") return 18;
    return 9;
}

function createActivityRows(risk: TestRisk): TestActivityRow[] {
    return getActivityIndices(risk).map((activityNumber, index) =>
        createActivityRow(activityNumber, index),
    );
}

function createActivityRow(
    activityNumber: number,
    sequenceIndex: number,
): TestActivityRow {
    return {
        id: `cmactivity00000000000000${activityNumber}`,
        studentId,
        phqResultId: phqId,
        activityNumber,
        status: sequenceIndex === 0 ? "in_progress" : "locked",
        unlockedAt: sequenceIndex === 0 ? activityDate : null,
        completedAt: null,
        scheduledDate: null,
        teacherId: null,
        teacherSnapshot: null,
        teacherNotes: null,
        internalProblems: null,
        externalProblems: null,
        problemType: null,
        assessedAt: null,
        _count: { worksheetUploads: 0 },
    };
}

function firstActivity(rows: TestActivityRow[]): TestActivityRow {
    const first = rows[0];
    if (!first) throw new Error("Expected at least one activity");
    return first;
}

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
        assessmentRound?: number;
    } = {},
) {
    return {
        id,
        studentId,
        academicYearId: `cmacademic${overrides.semester ?? 1}000000000001`,
        assessmentRound: overrides.assessmentRound ?? 1,
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
