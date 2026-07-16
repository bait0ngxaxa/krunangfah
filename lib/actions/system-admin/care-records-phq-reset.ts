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
import { staleCareRecordResponse } from "./care-records-concurrency";
import {
    CARE_RECORD_FILE_CLEANUP_WARNING_MESSAGE,
    cleanupSystemCareRecordFiles,
} from "./care-record-file-cleanup";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";

export async function resetSystemPhqResult(
    input: SystemCareRecordDeleteInput,
    actor: Actor,
): Promise<SystemEditResponse<SystemPhqRollbackResult>> {
    const existing = await prisma.phqResult.findUnique({
        where: { id: input.id },
        select: PHQ_SELECT,
    });
    if (!existing) return { success: false, message: "ไม่พบผลคัดกรอง PHQ" };

    const deletedPhqIds = [existing.id];

    const transactionResult = await runSerializableTransaction(async (tx) => {
        const latestPhq = await findLatestPhqForStudent(tx, existing.studentId);
        if (latestPhq && isNewerTerm(latestPhq, existing)) {
            return { status: "not-latest" } as const;
        }
        const claim = await tx.phqResult.updateMany({
            where: { id: existing.id, updatedAt: input.expectedUpdatedAt },
            data: { updatedAt: new Date() },
        });
        if (claim.count !== 1) return { status: "stale" } as const;
        const fileUrls = await deleteRelatedActivities(tx, deletedPhqIds);
        await logRollbackEvent(tx, existing, input.reason, actor, deletedPhqIds);
        await tx.phqResult.deleteMany({ where: { id: { in: deletedPhqIds } } });
        return { status: "deleted", fileUrls } as const;
    });
    if (transactionResult.status === "not-latest") {
        return {
            success: false,
            message: "ล้างผล PHQ ได้เฉพาะเทอมล่าสุดของนักเรียน",
        };
    }
    if (transactionResult.status === "stale") return staleCareRecordResponse();

    const { fileUrls } = transactionResult;
    const hasFileCleanupWarnings = await cleanupSystemCareRecordFiles(fileUrls);
    await revalidateCarePaths(existing.student.schoolId, existing.studentId);
    return {
        success: true,
        message: hasFileCleanupWarnings
            ? CARE_RECORD_FILE_CLEANUP_WARNING_MESSAGE
            : "ล้างผล PHQ เพื่อให้ครูทำใหม่แล้ว",
        updated: { deletedPhqIds },
    };
}

type Tx = Prisma.TransactionClient;

async function findLatestPhqForStudent(
    tx: Tx,
    studentId: string,
): Promise<PhqRow | null> {
    return tx.phqResult.findFirst({
        where: { studentId },
        select: PHQ_SELECT,
        orderBy: [
            { academicYear: { year: "desc" } },
            { academicYear: { semester: "desc" } },
            { assessmentRound: "desc" },
            { createdAt: "desc" },
        ],
    });
}

function isNewerTerm(latest: PhqRow, selected: PhqRow): boolean {
    if (latest.academicYear.year !== selected.academicYear.year) {
        return latest.academicYear.year > selected.academicYear.year;
    }
    return latest.academicYear.semester > selected.academicYear.semester;
}

async function deleteRelatedActivities(
    tx: Tx,
    phqResultIds: string[],
): Promise<string[]> {
    const where = { activityProgress: { phqResultId: { in: phqResultIds } } };
    const files = await tx.worksheetUpload.findMany({
        where,
        select: { fileUrl: true },
    });
    await tx.worksheetUpload.deleteMany({
        where,
    });
    await tx.activityProgress.deleteMany({
        where: { phqResultId: { in: phqResultIds } },
    });
    return files.map((file) => file.fileUrl);
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
        action: "RESET",
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
