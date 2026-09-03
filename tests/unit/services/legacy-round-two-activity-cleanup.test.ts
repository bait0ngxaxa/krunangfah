import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { LegacyActivityInspection } from "@/lib/services/legacy-round-two-activity-cleanup";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        activityProgress: {
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        systemAdminEvent: {
            findMany: vi.fn(),
        },
    };
    return {
        activityFindMany: vi.fn(),
        activityFindFirst: vi.fn(),
        systemAdminEventFindMany: vi.fn(),
        transaction: vi.fn(),
        tx,
    };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        activityProgress: {
            findMany: prismaMocks.activityFindMany,
            findFirst: prismaMocks.activityFindFirst,
        },
        systemAdminEvent: {
            findMany: prismaMocks.systemAdminEventFindMany,
        },
        $transaction: prismaMocks.transaction,
    },
}));

import {
    LEGACY_ACTIVITY_CLEANUP_BATCH_SIZE,
    auditLegacyActivityProgress,
    buildLegacyActivityCleanupWhere,
    classifyLegacyActivityProgress,
    cleanupLegacyActivityProgress,
} from "@/lib/services/legacy-round-two-activity-cleanup";

const baseDate = new Date("2026-08-01T00:00:00.000Z");

function createInspection(
    overrides: Partial<LegacyActivityInspection> = {},
): LegacyActivityInspection {
    return {
        id: "cmactivity000000000000001",
        studentId: "cmstudent000000000000001",
        phqResultId: "cmphq00000000000000001",
        phqStudentId: "cmstudent000000000000001",
        schoolId: "cmschool000000000000001",
        academicYearId: "cmacademic000000000000001",
        academicYearYear: 2569,
        academicYearSemester: 1,
        assessmentRound: 2,
        riskLevel: "yellow",
        activityNumber: 1,
        status: "in_progress",
        unlockedAt: baseDate,
        scheduledDate: null,
        completedAt: null,
        teacherId: null,
        teacherSnapshot: null,
        teacherNotes: null,
        internalProblems: null,
        externalProblems: null,
        problemType: null,
        assessedAt: null,
        worksheetCount: 0,
        systemAdminEventCount: 0,
        ...overrides,
    };
}

function createDbRow(
    overrides: Partial<LegacyActivityInspection> = {},
): Prisma.ActivityProgressGetPayload<{
    select: {
        id: true;
        studentId: true;
        phqResultId: true;
        activityNumber: true;
        status: true;
        unlockedAt: true;
        completedAt: true;
        scheduledDate: true;
        teacherId: true;
        teacherSnapshot: true;
        teacherNotes: true;
        internalProblems: true;
        externalProblems: true;
        problemType: true;
        assessedAt: true;
        _count: { select: { worksheetUploads: true } };
        student: { select: { schoolId: true } };
        phqResult: {
            select: {
                studentId: true;
                academicYearId: true;
                assessmentRound: true;
                riskLevel: true;
                academicYear: { select: { year: true; semester: true } };
            };
        };
    };
}> {
    const inspection = createInspection(overrides);
    return {
        id: inspection.id,
        studentId: inspection.studentId,
        phqResultId: inspection.phqResultId,
        activityNumber: inspection.activityNumber,
        status: inspection.status,
        unlockedAt: inspection.unlockedAt,
        completedAt: inspection.completedAt,
        scheduledDate: inspection.scheduledDate,
        teacherId: inspection.teacherId,
        teacherSnapshot: inspection.teacherSnapshot,
        teacherNotes: inspection.teacherNotes,
        internalProblems: inspection.internalProblems,
        externalProblems: inspection.externalProblems,
        problemType: inspection.problemType,
        assessedAt: inspection.assessedAt,
        _count: { worksheetUploads: inspection.worksheetCount },
        student: { schoolId: inspection.schoolId },
        phqResult: {
            studentId: inspection.phqStudentId,
            academicYearId: inspection.academicYearId,
            assessmentRound: inspection.assessmentRound,
            riskLevel: inspection.riskLevel,
            academicYear: {
                year: inspection.academicYearYear,
                semester: inspection.academicYearSemester,
            },
        },
    };
}

type TestDbRow = ReturnType<typeof createDbRow>;

function setupCleanupDiscovery(pages: TestDbRow[][]): void {
    const lastPage = pages[pages.length - 1];
    const lastRow = lastPage?.[lastPage.length - 1];
    if (!lastRow) throw new Error("Expected at least one cleanup row");

    prismaMocks.activityFindFirst.mockResolvedValue({ id: lastRow.id });
    for (const page of pages) {
        prismaMocks.activityFindMany.mockResolvedValueOnce(page);
    }
    prismaMocks.activityFindMany.mockResolvedValue([]);
}

describe("legacy round-two activity cleanup", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.activityFindFirst.mockResolvedValue(null);
        prismaMocks.systemAdminEventFindMany.mockResolvedValue([]);
        prismaMocks.tx.systemAdminEvent.findMany.mockResolvedValue([]);
        prismaMocks.transaction.mockImplementation(
            async (
                callback: (tx: typeof prismaMocks.tx) => Promise<unknown>,
            ) => callback(prismaMocks.tx),
        );
    });

    it("classifies the untouched initial generated state as a cleanup candidate", () => {
        expect(classifyLegacyActivityProgress(createInspection())).toEqual({
            classification: "cleanup_candidate",
            reasons: ["untouched_auto_generated"],
        });
    });

    it.each([
        ["worksheet", { worksheetCount: 1 }, "worksheet_upload"],
        ["teacher assignment", { teacherId: "cmteacher000000000000001" }, "teacher_id"],
        ["teacher snapshot", { teacherSnapshot: { id: "teacher" } }, "teacher_snapshot"],
        ["teacher notes", { teacherNotes: "บันทึกของครู" }, "teacher_notes"],
        ["scheduled date", { scheduledDate: baseDate }, "scheduled_date"],
        ["completion", { completedAt: baseDate }, "completed_at"],
        ["internal problem", { internalProblems: "ปัญหาภายใน" }, "internal_problems"],
        ["external problem", { externalProblems: "ปัญหาภายนอก" }, "external_problems"],
        ["problem type", { problemType: "internal" }, "problem_type"],
        ["assessment", { assessedAt: baseDate }, "assessed_at"],
        ["system admin event", { systemAdminEventCount: 1 }, "system_admin_event"],
    ] as const)("preserves a row with %s data", (_label, changes, reason) => {
        const result = classifyLegacyActivityProgress(
            createInspection(changes),
        );

        expect(result.classification).toBe("preserve");
        expect(result.reasons).toContain(reason);
    });

    it("preserves a completed activity even when its completion timestamp is present", () => {
        const result = classifyLegacyActivityProgress(
            createInspection({ status: "completed", completedAt: baseDate }),
        );

        expect(result).toEqual({
            classification: "preserve",
            reasons: ["completed_at", "non_initial_status"],
        });
    });

    it("preserves an activity that was unlocked after the initial sequence", () => {
        const result = classifyLegacyActivityProgress(
            createInspection({
                activityNumber: 2,
                status: "locked",
                unlockedAt: baseDate,
            }),
        );

        expect(result.classification).toBe("preserve");
        expect(result.reasons).toContain("activity_unlocked");
    });

    it("preserves an activity with a non-initial status even without other fields", () => {
        const result = classifyLegacyActivityProgress(
            createInspection({ status: "pending_assessment" }),
        );

        expect(result).toEqual({
            classification: "preserve",
            reasons: ["non_initial_status"],
        });
    });

    it("preserves malformed activity context and Round 1 rows", () => {
        expect(
            classifyLegacyActivityProgress(
                createInspection({ phqStudentId: "cmotherstudent00000000001" }),
            ).reasons,
        ).toContain("student_mismatch");
        expect(
            classifyLegacyActivityProgress(
                createInspection({ riskLevel: "red" }),
            ).reasons,
        ).toContain("activity_not_expected_for_risk");
        expect(
            classifyLegacyActivityProgress(
                createInspection({ assessmentRound: 1 }),
            ),
        ).toEqual({
            classification: "preserve",
            reasons: ["round_one_excluded"],
        });
    });

    it("audits only non-Round-1 rows and reports aggregate classifications", async () => {
        prismaMocks.activityFindMany.mockResolvedValue([
            createDbRow(),
            createDbRow({
                id: "cmactivity000000000000002",
                activityNumber: 2,
                status: "locked",
                unlockedAt: null,
                teacherNotes: "เก็บไว้ตรวจสอบ",
            }),
        ]);

        const report = await auditLegacyActivityProgress();

        expect(report).toMatchObject({
            totalLegacyRows: 2,
            roundTwoRows: 2,
            otherNonRoundOneRows: 0,
            cleanupCandidates: 1,
            preservedRows: 1,
        });
        expect(prismaMocks.activityFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { phqResult: { assessmentRound: { not: 1 } } },
            }),
        );
        expect(prismaMocks.transaction).not.toHaveBeenCalled();
    });

    it("builds a delete predicate with explicit round and worksheet safety checks", async () => {
        prismaMocks.activityFindMany.mockResolvedValue([createDbRow()]);
        const report = await auditLegacyActivityProgress();
        const candidate = report.records[0];
        if (!candidate) throw new Error("Expected a cleanup candidate");

        const predicate = buildLegacyActivityCleanupWhere(candidate);

        expect(predicate).toMatchObject({
            id: candidate.id,
            unlockedAt: candidate.unlockedAt,
            completedAt: null,
            scheduledDate: null,
            teacherId: null,
            teacherNotes: null,
            internalProblems: null,
            externalProblems: null,
            problemType: null,
            assessedAt: null,
            worksheetUploads: { none: {} },
            phqResult: {
                studentId: candidate.phqStudentId,
                academicYearId: candidate.academicYearId,
                assessmentRound: { not: 1 },
                riskLevel: candidate.riskLevel,
            },
        });
        expect(predicate.OR).toEqual([
            { teacherSnapshot: { equals: Prisma.DbNull } },
            { teacherSnapshot: { equals: Prisma.JsonNull } },
        ]);
    });

    it("deletes only candidates and uses the conditional predicate in a serializable transaction", async () => {
        const discoveredRows = [
            createDbRow(),
            createDbRow({
                id: "cmactivity000000000000002",
                activityNumber: 2,
                status: "locked",
                unlockedAt: null,
                teacherNotes: "ห้ามลบ",
            }),
        ];
        setupCleanupDiscovery([discoveredRows]);
        prismaMocks.tx.activityProgress.findMany.mockResolvedValue([
            ...discoveredRows,
        ]);
        prismaMocks.tx.activityProgress.deleteMany.mockResolvedValue({ count: 1 });

        const report = await cleanupLegacyActivityProgress();

        expect(report.deletedCount).toBe(1);
        expect(report.deletedIds).toEqual(["cmactivity000000000000001"]);
        expect(report.recheckRejectedCount).toBe(0);
        expect(report.recheckRejectedIds).toEqual([]);
        expect(report.batchesProcessed).toBe(1);
        expect(prismaMocks.transaction).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({ isolationLevel: "Serializable" }),
        );
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalledWith({
            where: expect.objectContaining({
                id: "cmactivity000000000000001",
                phqResult: expect.objectContaining({
                    assessmentRound: { not: 1 },
                }),
                worksheetUploads: { none: {} },
            }),
        });
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalledTimes(1);
    });

    it("reclassifies current transactional state before attempting deletion", async () => {
        const discoveredRow = createDbRow();
        setupCleanupDiscovery([[discoveredRow]]);
        prismaMocks.tx.activityProgress.findMany.mockResolvedValue([
            createDbRow({ worksheetCount: 1 }),
        ]);

        const report = await cleanupLegacyActivityProgress();

        expect(report.deletedCount).toBe(0);
        expect(report.deletedIds).toEqual([]);
        expect(report.recheckRejectedCount).toBe(1);
        expect(report.recheckRejectedIds).toEqual([
            "cmactivity000000000000001",
        ]);
        expect(prismaMocks.tx.activityProgress.deleteMany).not.toHaveBeenCalled();
    });

    it("reports a recheck rejection when the conditional delete matches no rows", async () => {
        const discoveredRow = createDbRow();
        setupCleanupDiscovery([[discoveredRow]]);
        prismaMocks.tx.activityProgress.findMany.mockResolvedValue([
            discoveredRow,
        ]);
        prismaMocks.tx.activityProgress.deleteMany.mockResolvedValue({ count: 0 });

        const report = await cleanupLegacyActivityProgress();

        expect(report.deletedCount).toBe(0);
        expect(report.deletedIds).toEqual([]);
        expect(report.recheckRejectedCount).toBe(1);
        expect(report.recheckRejectedIds).toEqual([
            "cmactivity000000000000001",
        ]);
    });

    it("processes multiple batches without preserved rows blocking the cursor", async () => {
        const firstCandidate = createDbRow();
        const preservedRows = Array.from(
            { length: LEGACY_ACTIVITY_CLEANUP_BATCH_SIZE - 1 },
            (_, index) =>
                createDbRow({
                    id: `cmactivity${String(index + 2).padStart(15, "0")}`,
                    activityNumber: 2,
                    status: "locked",
                    unlockedAt: null,
                    teacherNotes: "เก็บไว้ตรวจสอบ",
                }),
        );
        const laterCandidate = createDbRow({
            id: `cmactivity${String(LEGACY_ACTIVITY_CLEANUP_BATCH_SIZE + 1).padStart(15, "0")}`,
        });
        const firstPage = [firstCandidate, ...preservedRows];
        const secondPage = [laterCandidate];

        setupCleanupDiscovery([firstPage, secondPage]);
        prismaMocks.tx.activityProgress.findMany
            .mockResolvedValueOnce(firstPage)
            .mockResolvedValueOnce(secondPage);
        prismaMocks.tx.activityProgress.deleteMany.mockResolvedValue({ count: 1 });

        const report = await cleanupLegacyActivityProgress();

        expect(report).toMatchObject({
            totalLegacyRows: LEGACY_ACTIVITY_CLEANUP_BATCH_SIZE + 1,
            cleanupCandidates: 2,
            preservedRows: LEGACY_ACTIVITY_CLEANUP_BATCH_SIZE - 1,
            deletedCount: 2,
            deletedIds: [firstCandidate.id, laterCandidate.id],
            recheckRejectedCount: 0,
            recheckRejectedIds: [],
            batchesProcessed: 2,
        });
        expect(prismaMocks.transaction).toHaveBeenCalledTimes(2);
        expect(prismaMocks.tx.activityProgress.findMany).toHaveBeenCalledTimes(2);
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalledTimes(2);
        const firstPageLastId = preservedRows[preservedRows.length - 1]?.id;
        if (!firstPageLastId) throw new Error("Expected a full first page");
        expect(prismaMocks.activityFindFirst).toHaveBeenCalledWith({
            where: { phqResult: { assessmentRound: { not: 1 } } },
            select: { id: true },
            orderBy: { id: "desc" },
        });
        expect(prismaMocks.activityFindMany).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                where: expect.objectContaining({
                    AND: expect.arrayContaining([
                        {
                            id: {
                                gt: firstPageLastId,
                                lte: laterCandidate.id,
                            },
                        },
                    ]),
                }),
            }),
        );
    });

    it("retries only the batch that encounters a serializable conflict", async () => {
        const firstCandidate = createDbRow();
        const laterCandidate = createDbRow({
            id: "cmactivity000000000000002",
        });
        setupCleanupDiscovery([[firstCandidate], [laterCandidate]]);
        prismaMocks.tx.activityProgress.findMany
            .mockResolvedValueOnce([firstCandidate])
            .mockResolvedValueOnce([laterCandidate]);
        prismaMocks.tx.activityProgress.deleteMany.mockResolvedValue({ count: 1 });

        let transactionAttempts = 0;
        prismaMocks.transaction.mockImplementation(
            async (
                callback: (tx: typeof prismaMocks.tx) => Promise<unknown>,
            ) => {
                transactionAttempts += 1;
                if (transactionAttempts === 2) {
                    throw new Prisma.PrismaClientKnownRequestError(
                        "serialization conflict",
                        { code: "P2034", clientVersion: "test" },
                    );
                }
                return callback(prismaMocks.tx);
            },
        );

        const report = await cleanupLegacyActivityProgress();

        expect(report.deletedIds).toEqual([
            firstCandidate.id,
            laterCandidate.id,
        ]);
        expect(report.batchesProcessed).toBe(2);
        expect(transactionAttempts).toBe(3);
        expect(prismaMocks.tx.activityProgress.findMany).toHaveBeenCalledTimes(2);
    });
});
