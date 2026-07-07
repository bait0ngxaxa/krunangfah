import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import { prisma } from "@/lib/database/prisma";
import type {
    SystemEditResponse,
    SystemPhqRollbackResult,
} from "./types";
import type { SystemCareRecordDeleteInput } from "@/lib/validations/system-admin.validation";
import { createSystemAdminEditEvent } from "./events";
import type { Actor } from "./mutations";
import {
    PHQ_SELECT,
    type PhqRow,
} from "./care-records-selects";

export async function resetSystemPhqResult(
    input: SystemCareRecordDeleteInput,
    actor: Actor,
): Promise<SystemEditResponse<SystemPhqRollbackResult>> {
    const existing = await prisma.phqResult.findUnique({
        where: { id: input.id },
        select: PHQ_SELECT,
    });
    if (!existing) return { success: false, message: "ไม่พบผลคัดกรอง PHQ" };

    const rollbackTargets = await findRollbackTargets(existing);
    const deletedPhqIds = rollbackTargets.map((row) => row.id);

    await prisma.$transaction(async (tx) => {
        await deleteRelatedActivities(tx, deletedPhqIds);
        await logRollbackEvent(tx, existing, input.reason, actor, deletedPhqIds);
        await tx.phqResult.deleteMany({ where: { id: { in: deletedPhqIds } } });
    });

    await revalidateCarePaths(existing.student.schoolId, existing.studentId);
    return {
        success: true,
        message: "ล้างผล PHQ เพื่อให้ครูทำใหม่แล้ว",
        updated: { deletedPhqIds },
    };
}

type Tx = Prisma.TransactionClient;

async function findRollbackTargets(phq: PhqRow): Promise<PhqRow[]> {
    return prisma.phqResult.findMany({
        where: {
            studentId: phq.studentId,
            academicYearId: phq.academicYearId,
            assessmentRound: { gte: phq.assessmentRound },
        },
        select: PHQ_SELECT,
        orderBy: { assessmentRound: "asc" },
    });
}

async function deleteRelatedActivities(
    tx: Tx,
    phqResultIds: string[],
): Promise<void> {
    await tx.worksheetUpload.deleteMany({
        where: { activityProgress: { phqResultId: { in: phqResultIds } } },
    });
    await tx.activityProgress.deleteMany({
        where: { phqResultId: { in: phqResultIds } },
    });
}

async function logRollbackEvent(
    tx: Tx,
    phq: PhqRow,
    reason: string,
    actor: Actor,
    deletedPhqIds: string[],
): Promise<void> {
    await createSystemAdminEditEvent({
        tx,
        targetType: "phqResult",
        targetId: phq.id,
        targetLabel: `PHQ รอบ ${phq.assessmentRound}`,
        reason,
        actor,
        changes: [{
            field: "record",
            label: "ล้างผล PHQ เพื่อทำใหม่",
            before: `${phq.totalScore} คะแนน`,
            after: `${deletedPhqIds.length} รายการถูกลบ`,
        }],
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
