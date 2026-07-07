import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import { prisma } from "@/lib/database/prisma";
import type {
    SystemActivityRecord,
    SystemEditResponse,
} from "./types";
import type { SystemCareRecordDeleteInput } from "@/lib/validations/system-admin.validation";
import { createSystemAdminEditEvent } from "./events";
import type { Actor } from "./mutations";
import {
    ACTIVITY_SELECT,
    type ActivityRow,
    toActivityRecord,
} from "./care-records-selects";

export async function resetSystemActivityProgress(
    input: SystemCareRecordDeleteInput,
    actor: Actor,
): Promise<SystemEditResponse<SystemActivityRecord>> {
    const existing = await prisma.activityProgress.findUnique({
        where: { id: input.id },
        select: ACTIVITY_SELECT,
    });
    if (!existing) return { success: false, message: "ไม่พบกิจกรรม" };

    const updated = await prisma.$transaction(async (tx) => {
        await resetWorksheets(tx, existing);
        await lockLaterActivities(tx, existing);
        const row = await resetSelectedActivity(tx, existing);
        await createSystemAdminEditEvent({
            tx,
            targetType: "activityProgress",
            targetId: row.id,
            targetLabel: `กิจกรรมที่ ${row.activityNumber}`,
            reason: input.reason,
            actor,
            changes: [{
                field: "status",
                label: "ถอยสถานะกิจกรรม",
                before: existing.status,
                after: "in_progress",
            }],
        });
        return row;
    });

    await revalidateCarePaths(updated.student.schoolId, updated.studentId);
    return {
        success: true,
        message: "ล้างผลกิจกรรมและถอยกลับเป็นกำลังดำเนินการแล้ว",
        updated: toActivityRecord(updated),
    };
}

type Tx = Prisma.TransactionClient;

async function resetWorksheets(tx: Tx, activity: ActivityRow): Promise<void> {
    await tx.worksheetUpload.deleteMany({
        where: {
            activityProgress: {
                studentId: activity.studentId,
                phqResultId: activity.phqResultId,
                activityNumber: { gte: activity.activityNumber },
            },
        },
    });
}

async function lockLaterActivities(tx: Tx, activity: ActivityRow): Promise<void> {
    await tx.activityProgress.updateMany({
        where: {
            studentId: activity.studentId,
            phqResultId: activity.phqResultId,
            activityNumber: { gt: activity.activityNumber },
        },
        data: {
            status: "locked",
            unlockedAt: null,
            scheduledDate: null,
            completedAt: null,
            teacherId: null,
            teacherNotes: null,
            internalProblems: null,
            externalProblems: null,
            problemType: null,
            assessedAt: null,
        },
    });
}

async function resetSelectedActivity(tx: Tx, activity: ActivityRow) {
    return tx.activityProgress.update({
        where: { id: activity.id },
        data: {
            status: "in_progress",
            unlockedAt: activity.unlockedAt ?? new Date(),
            completedAt: null,
            teacherNotes: null,
            internalProblems: null,
            externalProblems: null,
            problemType: null,
            assessedAt: null,
        },
        select: ACTIVITY_SELECT,
    });
}

async function revalidateCarePaths(
    schoolId: string,
    studentId: string,
): Promise<void> {
    revalidateStudentsCache(schoolId, studentId);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/admin/system");
    await revalidateAnalyticsCache(schoolId);
}
