import { Prisma } from "@prisma/client";
import type {
    ActivityStatus,
    ProblemType,
    RiskLevel,
} from "@prisma/client";
import {
    canGenerateActivitiesForAssessmentRound,
    getActivityIndices,
} from "@/lib/actions/activity/constants";
import { prisma } from "@/lib/database/prisma";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";

/**
 * The round restriction is intentionally kept in the database predicate as
 * well as in the application classification. This prevents a malformed or
 * stale classification from ever selecting a Round 1 activity row.
 */
export const LEGACY_ACTIVITY_PROGRESS_WHERE = {
    phqResult: {
        assessmentRound: { not: 1 },
    },
} satisfies Prisma.ActivityProgressWhereInput;

const LEGACY_ACTIVITY_PROGRESS_SELECT = {
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
    student: { select: { schoolId: true } },
    phqResult: {
        select: {
            studentId: true,
            academicYearId: true,
            assessmentRound: true,
            riskLevel: true,
            academicYear: { select: { year: true, semester: true } },
        },
    },
} satisfies Prisma.ActivityProgressSelect;

type LegacyActivityProgressDbRow = Prisma.ActivityProgressGetPayload<{
    select: typeof LEGACY_ACTIVITY_PROGRESS_SELECT;
}>;

type ActivityProgressReader = Pick<
    Prisma.TransactionClient,
    "activityProgress" | "systemAdminEvent"
>;

export type LegacyActivityPreservationReason =
    | "round_one_excluded"
    | "worksheet_upload"
    | "teacher_id"
    | "teacher_snapshot"
    | "teacher_notes"
    | "scheduled_date"
    | "completed_at"
    | "internal_problems"
    | "external_problems"
    | "problem_type"
    | "assessed_at"
    | "non_initial_status"
    | "activity_unlocked"
    | "missing_initial_unlock_timestamp"
    | "activity_not_expected_for_risk"
    | "student_mismatch"
    | "system_admin_event";

export interface LegacyActivityInspection {
    id: string;
    studentId: string;
    phqResultId: string;
    phqStudentId: string;
    schoolId: string;
    academicYearId: string;
    academicYearYear: number;
    academicYearSemester: number;
    assessmentRound: number;
    riskLevel: RiskLevel;
    activityNumber: number;
    status: ActivityStatus;
    unlockedAt: Date | null;
    scheduledDate: Date | null;
    completedAt: Date | null;
    teacherId: string | null;
    teacherSnapshot: Prisma.JsonValue | null;
    teacherNotes: string | null;
    internalProblems: string | null;
    externalProblems: string | null;
    problemType: ProblemType | null;
    assessedAt: Date | null;
    worksheetCount: number;
    systemAdminEventCount: number;
}

export interface LegacyActivityClassification {
    classification: "cleanup_candidate" | "preserve";
    reasons: string[];
}

export interface LegacyActivityAuditRecord {
    id: string;
    studentId: string;
    phqResultId: string;
    phqStudentId: string;
    schoolId: string;
    academicYearId: string;
    academicYearYear: number;
    academicYearSemester: number;
    assessmentRound: number;
    riskLevel: RiskLevel;
    activityNumber: number;
    status: ActivityStatus;
    unlockedAt: Date | null;
    worksheetCount: number;
    systemAdminEventCount: number;
    classification: "cleanup_candidate" | "preserve";
    reasons: string[];
}

export interface LegacyActivityAuditReport {
    totalLegacyRows: number;
    roundTwoRows: number;
    otherNonRoundOneRows: number;
    cleanupCandidates: number;
    preservedRows: number;
    records: LegacyActivityAuditRecord[];
}

export interface LegacyActivityCleanupReport extends LegacyActivityAuditReport {
    deletedCount: number;
    deletedIds: string[];
    recheckRejectedCount: number;
    recheckRejectedIds: string[];
}

export interface LegacyActivityAuditOptions {
    /** Optional test/maintenance scope; omitted means all legacy rows. */
    studentId?: string;
}

/**
 * Classify one non-Round-1 activity row without treating generated state as
 * user interaction. The expected initial state is derived from the stored
 * risk sequence, so an unlocked later activity is conservatively preserved.
 */
export function classifyLegacyActivityProgress(
    activity: LegacyActivityInspection,
): LegacyActivityClassification {
    const reasons: LegacyActivityPreservationReason[] = [];

    if (canGenerateActivitiesForAssessmentRound(activity.assessmentRound)) {
        reasons.push("round_one_excluded");
    }
    if (activity.worksheetCount > 0) reasons.push("worksheet_upload");
    if (activity.teacherId !== null) reasons.push("teacher_id");
    if (activity.teacherSnapshot !== null) reasons.push("teacher_snapshot");
    if (activity.teacherNotes !== null) reasons.push("teacher_notes");
    if (activity.scheduledDate !== null) reasons.push("scheduled_date");
    if (activity.completedAt !== null) reasons.push("completed_at");
    if (activity.internalProblems !== null) {
        reasons.push("internal_problems");
    }
    if (activity.externalProblems !== null) {
        reasons.push("external_problems");
    }
    if (activity.problemType !== null) reasons.push("problem_type");
    if (activity.assessedAt !== null) reasons.push("assessed_at");
    if (activity.studentId !== activity.phqStudentId) {
        reasons.push("student_mismatch");
    }
    if (activity.systemAdminEventCount > 0) {
        reasons.push("system_admin_event");
    }

    const expectedState = getExpectedInitialState(
        activity.riskLevel,
        activity.activityNumber,
    );
    if (!expectedState) {
        reasons.push("activity_not_expected_for_risk");
    } else {
        if (activity.status !== expectedState.status) {
            reasons.push("non_initial_status");
        }
        if (expectedState.unlockState === "required" && activity.unlockedAt === null) {
            reasons.push("missing_initial_unlock_timestamp");
        }
        if (expectedState.unlockState === "forbidden" && activity.unlockedAt !== null) {
            reasons.push("activity_unlocked");
        }
    }

    if (reasons.length > 0) {
        return { classification: "preserve", reasons };
    }

    return {
        classification: "cleanup_candidate",
        reasons: ["untouched_auto_generated"],
    };
}

/**
 * Build the predicate used for the actual delete. Every user-owned field is
 * checked again, worksheet absence is checked again, and the round != 1
 * condition is explicit in the related PHQ predicate.
 */
export function buildLegacyActivityCleanupWhere(
    candidate: LegacyActivityAuditRecord,
): Prisma.ActivityProgressWhereInput {
    if (candidate.classification !== "cleanup_candidate") {
        throw new Error("Only cleanup candidates may be deleted");
    }

    return {
        id: candidate.id,
        studentId: candidate.studentId,
        phqResultId: candidate.phqResultId,
        activityNumber: candidate.activityNumber,
        status: candidate.status,
        unlockedAt: candidate.unlockedAt,
        completedAt: null,
        scheduledDate: null,
        teacherId: null,
        teacherNotes: null,
        internalProblems: null,
        externalProblems: null,
        problemType: null,
        assessedAt: null,
        OR: [
            { teacherSnapshot: { equals: Prisma.DbNull } },
            { teacherSnapshot: { equals: Prisma.JsonNull } },
        ],
        worksheetUploads: { none: {} },
        phqResult: {
            studentId: candidate.phqStudentId,
            academicYearId: candidate.academicYearId,
            assessmentRound: { not: 1 },
            riskLevel: candidate.riskLevel,
        },
    };
}

export async function auditLegacyActivityProgress(
    options: LegacyActivityAuditOptions = {},
): Promise<LegacyActivityAuditReport> {
    const activities = await findLegacyActivities(prisma, options);
    return buildAuditReport(activities);
}

export async function cleanupLegacyActivityProgress(
    options: LegacyActivityAuditOptions = {},
): Promise<LegacyActivityCleanupReport> {
    return runSerializableTransaction(async (tx) => {
        // Classification and deletion happen in the same serializable
        // transaction. The conditional delete below is the final TOCTOU guard.
        const activities = await findLegacyActivities(tx, options);
        const report = buildAuditReport(activities);
        const deletedIds: string[] = [];
        const recheckRejectedIds: string[] = [];

        for (const record of report.records) {
            if (record.classification !== "cleanup_candidate") continue;

            const result = await tx.activityProgress.deleteMany({
                where: buildLegacyActivityCleanupWhere(record),
            });
            if (result.count === 1) {
                deletedIds.push(record.id);
            } else if (result.count === 0) {
                recheckRejectedIds.push(record.id);
            } else {
                throw new Error(
                    `Legacy activity cleanup affected an unexpected number of rows for ${record.id}`,
                );
            }
        }

        return {
            ...report,
            deletedCount: deletedIds.length,
            deletedIds,
            recheckRejectedCount: recheckRejectedIds.length,
            recheckRejectedIds,
        };
    });
}

function getExpectedInitialState(
    riskLevel: RiskLevel,
    activityNumber: number,
): { status: ActivityStatus; unlockState: "required" | "forbidden" } | null {
    const activityIndex = getActivityIndices(riskLevel).indexOf(activityNumber);
    if (activityIndex < 0) return null;

    return {
        status: activityIndex === 0 ? "in_progress" : "locked",
        unlockState: activityIndex === 0 ? "required" : "forbidden",
    };
}

async function findLegacyActivities(
    db: ActivityProgressReader,
    options: LegacyActivityAuditOptions,
): Promise<LegacyActivityInspection[]> {
    const where: Prisma.ActivityProgressWhereInput = options.studentId
        ? {
              AND: [
                  LEGACY_ACTIVITY_PROGRESS_WHERE,
                  { studentId: options.studentId },
              ],
          }
        : LEGACY_ACTIVITY_PROGRESS_WHERE;
    const rows = await db.activityProgress.findMany({
        where,
        select: LEGACY_ACTIVITY_PROGRESS_SELECT,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (rows.length === 0) return [];

    const events = await db.systemAdminEvent.findMany({
        where: {
            targetType: "activityProgress",
            targetId: { in: rows.map((row) => row.id) },
        },
        select: { targetId: true },
    });
    const eventCounts = new Map<string, number>();
    for (const event of events) {
        eventCounts.set(
            event.targetId,
            (eventCounts.get(event.targetId) ?? 0) + 1,
        );
    }

    return rows.map((row) =>
        toInspection(row, eventCounts.get(row.id) ?? 0),
    );
}

function toInspection(
    row: LegacyActivityProgressDbRow,
    systemAdminEventCount: number,
): LegacyActivityInspection {
    return {
        id: row.id,
        studentId: row.studentId,
        phqResultId: row.phqResultId,
        phqStudentId: row.phqResult.studentId,
        schoolId: row.student.schoolId,
        academicYearId: row.phqResult.academicYearId,
        academicYearYear: row.phqResult.academicYear.year,
        academicYearSemester: row.phqResult.academicYear.semester,
        assessmentRound: row.phqResult.assessmentRound,
        riskLevel: row.phqResult.riskLevel,
        activityNumber: row.activityNumber,
        status: row.status,
        unlockedAt: row.unlockedAt,
        scheduledDate: row.scheduledDate,
        completedAt: row.completedAt,
        teacherId: row.teacherId,
        teacherSnapshot: row.teacherSnapshot,
        teacherNotes: row.teacherNotes,
        internalProblems: row.internalProblems,
        externalProblems: row.externalProblems,
        problemType: row.problemType,
        assessedAt: row.assessedAt,
        worksheetCount: row._count.worksheetUploads,
        systemAdminEventCount,
    };
}

function buildAuditReport(
    activities: LegacyActivityInspection[],
): LegacyActivityAuditReport {
    const records = activities.map((activity) => {
        const classification = classifyLegacyActivityProgress(activity);
        return {
            id: activity.id,
            studentId: activity.studentId,
            phqResultId: activity.phqResultId,
            phqStudentId: activity.phqStudentId,
            schoolId: activity.schoolId,
            academicYearId: activity.academicYearId,
            academicYearYear: activity.academicYearYear,
            academicYearSemester: activity.academicYearSemester,
            assessmentRound: activity.assessmentRound,
            riskLevel: activity.riskLevel,
            activityNumber: activity.activityNumber,
            status: activity.status,
            unlockedAt: activity.unlockedAt,
            worksheetCount: activity.worksheetCount,
            systemAdminEventCount: activity.systemAdminEventCount,
            ...classification,
        };
    });
    const cleanupCandidates = records.filter(
        (record) => record.classification === "cleanup_candidate",
    ).length;

    return {
        totalLegacyRows: records.length,
        roundTwoRows: records.filter((record) => record.assessmentRound === 2)
            .length,
        otherNonRoundOneRows: records.filter(
            (record) => record.assessmentRound !== 1 && record.assessmentRound !== 2,
        ).length,
        cleanupCandidates,
        preservedRows: records.length - cleanupCandidates,
        records,
    };
}
