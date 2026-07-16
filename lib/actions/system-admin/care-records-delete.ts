import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import { prisma } from "@/lib/database/prisma";
import type { SystemEditResponse } from "./types";
import type { SystemCareRecordDeleteInput } from "@/lib/validations/system-admin.validation";
import { createSystemAdminEditEvent } from "./events";
import type { Actor } from "./mutations";
import {
    COUNSELING_SELECT,
    HOME_VISIT_SELECT,
} from "./care-records-selects";
import { staleCareRecordResponse } from "./care-records-concurrency";

export async function softDeleteSystemCareRecord(
    type: "counselingSession" | "homeVisit",
    input: SystemCareRecordDeleteInput,
    actor: Actor,
): Promise<SystemEditResponse<null>> {
    if (type === "counselingSession") {
        return softDeleteCounseling(input, actor);
    }
    return softDeleteHomeVisit(input, actor);
}

async function softDeleteCounseling(
    input: SystemCareRecordDeleteInput,
    actor: Actor,
): Promise<SystemEditResponse<null>> {
    const existing = await prisma.counselingSession.findFirst({
        where: { id: input.id, deletedAt: null },
        select: COUNSELING_SELECT,
    });
    if (!existing) return { success: false, message: "ไม่พบบันทึก" };

    const deleted = await prisma.$transaction(async (tx) => {
        const write = await tx.counselingSession.updateMany({
            where: { id: existing.id, updatedAt: input.expectedUpdatedAt },
            data: getDeleteData(actor, input.reason),
        });
        if (write.count !== 1) return false;
        await logDeleteEvent(
            tx,
            "counselingSession",
            existing.id,
            `ปรึกษาครั้งที่ ${existing.sessionNumber}`,
            input.reason,
            actor,
        );
        return true;
    });
    if (!deleted) return staleCareRecordResponse();

    revalidateCareRecordPaths(existing.studentId);
    return { success: true, message: "ลบบันทึกการให้คำปรึกษาแล้ว" };
}

async function softDeleteHomeVisit(
    input: SystemCareRecordDeleteInput,
    actor: Actor,
): Promise<SystemEditResponse<null>> {
    const existing = await prisma.homeVisit.findFirst({
        where: { id: input.id, deletedAt: null },
        select: HOME_VISIT_SELECT,
    });
    if (!existing) return { success: false, message: "ไม่พบบันทึก" };

    const deleted = await prisma.$transaction(async (tx) => {
        const write = await tx.homeVisit.updateMany({
            where: { id: existing.id, updatedAt: input.expectedUpdatedAt },
            data: getDeleteData(actor, input.reason),
        });
        if (write.count !== 1) return false;
        await logDeleteEvent(
            tx,
            "homeVisit",
            existing.id,
            `เยี่ยมบ้านครั้งที่ ${existing.visitNumber}`,
            input.reason,
            actor,
        );
        return true;
    });
    if (!deleted) return staleCareRecordResponse();

    revalidateCareRecordPaths(existing.studentId);
    return { success: true, message: "ลบบันทึกเยี่ยมบ้านแล้ว" };
}

async function logDeleteEvent(
    tx: Prisma.TransactionClient,
    targetType: "counselingSession" | "homeVisit",
    targetId: string,
    targetLabel: string,
    reason: string,
    actor: Actor,
): Promise<void> {
    await createSystemAdminEditEvent({
        tx,
        targetType,
        targetId,
        targetLabel,
        action: "DELETE",
        reason,
        actor,
        changes: [
            {
                field: "deletedAt",
                label: "ลบรายการย่อยแบบกู้คืนได้",
                before: null,
                after: "deleted",
            },
        ],
    });
}

function getDeleteData(actor: Actor, reason: string) {
    return {
        deletedAt: new Date(),
        deletedById: actor.id,
        deleteReason: reason,
    };
}

function revalidateCareRecordPaths(studentId: string): void {
    revalidateStudentsCache(studentId);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/admin/system");
}
