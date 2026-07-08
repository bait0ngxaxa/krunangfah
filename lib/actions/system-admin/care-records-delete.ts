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

    await prisma.$transaction(async (tx) => {
        await tx.counselingSession.update({
            where: { id: existing.id },
            data: getDeleteData(actor, input.reason),
        });
        await logDeleteEvent(
            tx,
            "counselingSession",
            existing.id,
            `ปรึกษาครั้งที่ ${existing.sessionNumber}`,
            input.reason,
            actor,
        );
    });

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

    await prisma.$transaction(async (tx) => {
        await tx.homeVisit.update({
            where: { id: existing.id },
            data: getDeleteData(actor, input.reason),
        });
        await logDeleteEvent(
            tx,
            "homeVisit",
            existing.id,
            `เยี่ยมบ้านครั้งที่ ${existing.visitNumber}`,
            input.reason,
            actor,
        );
    });

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
