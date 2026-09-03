import { Prisma } from "@prisma/client";
import type { ActivityStatus } from "@prisma/client";
import { buildInitialActivityProgressRecords } from "@/lib/actions/activity/initial-state";
import { getActivityIndices } from "@/lib/actions/activity/constants";

export const PHQ_ACTIVITY_RECONCILIATION_REJECTED_MESSAGE =
    "ไม่สามารถเปลี่ยนระดับความเสี่ยงได้ เนื่องจากมีกิจกรรมที่เริ่มใช้งานแล้ว เพื่อป้องกันข้อมูลกิจกรรมสูญหาย";

const ACTIVITY_PROGRESS_SELECT = {
    id: true,
    studentId: true,
    phqResultId: true,
    activityNumber: true,
    status: true,
    unlockedAt: true,
    completedAt: true,
    scheduledDate: true,
    teacherId: true,
    teacherSnapshot: true,
    teacherNotes: true,
    internalProblems: true,
    externalProblems: true,
    problemType: true,
    assessedAt: true,
    _count: { select: { worksheetUploads: true } },
} satisfies Prisma.ActivityProgressSelect;

export type ActivityProgressRow = Prisma.ActivityProgressGetPayload<{
    select: typeof ACTIVITY_PROGRESS_SELECT;
}>;

type Tx = Pick<Prisma.TransactionClient, "activityProgress" | "systemAdminEvent">;

export type ActivitySequenceInspectionResult =
    | {
          status: "unchanged";
          oldSequence: number[];
          newSequence: number[];
      }
    | {
          status: "safe";
          plan: ActivitySequenceReconciliationPlan;
      }
    | {
          status: "rejected";
          oldSequence: number[];
          newSequence: number[];
      };

export interface ActivitySequenceReconciliationPlan {
    input: {
        studentId: string;
        phqResultId: string;
        newRiskLevel: string;
    };
    oldSequence: number[];
    newSequence: number[];
    rows: ActivityProgressRow[];
}

export class ActivitySequenceReconciliationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ActivitySequenceReconciliationError";
    }
}

export async function inspectRoundOneActivitySequence(
    tx: Tx,
    input: {
        studentId: string;
        phqResultId: string;
        oldRiskLevel: string;
        newRiskLevel: string;
    },
): Promise<ActivitySequenceInspectionResult> {
    const oldSequence = getActivityIndices(input.oldRiskLevel).slice();
    const newSequence = getActivityIndices(input.newRiskLevel).slice();

    if (areSequencesEqual(oldSequence, newSequence)) {
        return { status: "unchanged", oldSequence, newSequence };
    }

    const currentRows = await tx.activityProgress.findMany({
        where: { phqResultId: input.phqResultId },
        select: ACTIVITY_PROGRESS_SELECT,
        orderBy: { activityNumber: "asc" },
    });
    const systemAdminEventTargetIds = await findSystemAdminEventTargetIds(
        tx,
        currentRows,
    );

    if (
        !isPristineActivitySequence(
            currentRows,
            input,
            oldSequence,
            systemAdminEventTargetIds,
        )
    ) {
        return { status: "rejected", oldSequence, newSequence };
    }

    return {
        status: "safe",
        plan: {
            input: {
                studentId: input.studentId,
                phqResultId: input.phqResultId,
                newRiskLevel: input.newRiskLevel,
            },
            oldSequence,
            newSequence,
            rows: currentRows,
        },
    };
}

export async function replacePristineActivitySequence(
    tx: Tx,
    plan: ActivitySequenceReconciliationPlan,
): Promise<void> {
    const { input, oldSequence, newSequence, rows } = plan;
    if (rows.length > 0) {
        const deleted = await tx.activityProgress.deleteMany({
            where: buildPristineActivityProgressDeleteWhere(
                input,
                oldSequence,
                rows,
            ),
        });
        if (deleted.count !== oldSequence.length) {
            throw new ActivitySequenceReconciliationError(
                "Pristine activity sequence delete affected an unexpected number of rows",
            );
        }
    }

    const records = buildInitialActivityProgressRecords(
        input.studentId,
        input.phqResultId,
        input.newRiskLevel,
    );
    if (records.length > 0) {
        const created = await tx.activityProgress.createMany({ data: records });
        if (created.count !== newSequence.length) {
            throw new ActivitySequenceReconciliationError(
                "Activity sequence create affected an unexpected number of rows",
            );
        }
    }
}

export function formatActivitySequence(sequence: readonly number[]): string {
    return sequence.length > 0 ? sequence.join(", ") : "ไม่มี";
}

export function buildPristineActivityProgressDeleteWhere(
    input: {
        studentId: string;
        phqResultId: string;
    },
    oldSequence: readonly number[],
    rows: readonly ActivityProgressRow[],
): Prisma.ActivityProgressWhereInput {
    const expectedStateFilters = rows.map((row) => {
        const expectedState = getExpectedInitialState(
            oldSequence,
            row.activityNumber,
        );
        if (!expectedState) {
            throw new ActivitySequenceReconciliationError(
                "Cannot build a delete predicate for an unexpected activity",
            );
        }

        return {
            id: row.id,
            activityNumber: row.activityNumber,
            status: expectedState.status,
            unlockedAt:
                expectedState.unlockState === "required"
                    ? { not: null }
                    : null,
        };
    });

    return {
        id: { in: rows.map((row) => row.id) },
        studentId: input.studentId,
        phqResultId: input.phqResultId,
        activityNumber: { in: [...oldSequence] },
        status: { in: ["in_progress", "locked"] },
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
            studentId: input.studentId,
            assessmentRound: 1,
        },
        OR: [
            { teacherSnapshot: { equals: Prisma.DbNull } },
            { teacherSnapshot: { equals: Prisma.JsonNull } },
        ],
        AND: [
            { OR: expectedStateFilters },
        ],
    };
}

async function findSystemAdminEventTargetIds(
    tx: Tx,
    rows: readonly ActivityProgressRow[],
): Promise<Set<string>> {
    if (rows.length === 0) return new Set();

    const events = await tx.systemAdminEvent.findMany({
        where: {
            targetType: "activityProgress",
            targetId: { in: rows.map((row) => row.id) },
        },
        select: { targetId: true },
    });
    return new Set(events.map((event) => event.targetId));
}

function isPristineActivitySequence(
    rows: readonly ActivityProgressRow[],
    input: { studentId: string; phqResultId: string },
    oldSequence: readonly number[],
    systemAdminEventTargetIds: ReadonlySet<string>,
): boolean {
    if (rows.length === 0) return true;
    if (!areSequencesEqual(rows.map((row) => row.activityNumber), oldSequence)) {
        return false;
    }

    return rows.every((row) => {
        if (row.studentId !== input.studentId) return false;
        if (row.phqResultId !== input.phqResultId) return false;
        if (row._count.worksheetUploads !== 0) return false;
        if (row.teacherId !== null) return false;
        if (!isEmptyJson(row.teacherSnapshot)) return false;
        if (row.teacherNotes !== null) return false;
        if (row.scheduledDate !== null) return false;
        if (row.completedAt !== null) return false;
        if (row.internalProblems !== null) return false;
        if (row.externalProblems !== null) return false;
        if (row.problemType !== null) return false;
        if (row.assessedAt !== null) return false;
        if (systemAdminEventTargetIds.has(row.id)) return false;

        const expectedState = getExpectedInitialState(
            oldSequence,
            row.activityNumber,
        );
        return (
            expectedState !== null &&
            row.status === expectedState.status &&
            (expectedState.unlockState === "required"
                ? row.unlockedAt !== null
                : row.unlockedAt === null)
        );
    });
}

function getExpectedInitialState(
    sequence: readonly number[],
    activityNumber: number,
): { status: ActivityStatus; unlockState: "required" | "forbidden" } | null {
    const activityIndex = sequence.indexOf(activityNumber);
    if (activityIndex < 0) return null;

    return {
        status: activityIndex === 0 ? "in_progress" : "locked",
        unlockState: activityIndex === 0 ? "required" : "forbidden",
    };
}

function isEmptyJson(value: Prisma.JsonValue | null): boolean {
    const nullMarkers: readonly unknown[] = [Prisma.DbNull, Prisma.JsonNull];
    return value === null || nullMarkers.includes(value);
}

function areSequencesEqual(
    left: readonly number[],
    right: readonly number[],
): boolean {
    return (
        left.length === right.length &&
        left.every((activityNumber, index) => activityNumber === right.at(index))
    );
}
