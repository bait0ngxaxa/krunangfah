import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import { prisma } from "@/lib/database/prisma";
import type {
    SystemCounselingRecord,
    SystemEditResponse,
    SystemHomeVisitRecord,
} from "./types";
import type {
    SystemCounselingEditInput,
    SystemHomeVisitEditInput,
} from "@/lib/validations/system-admin.validation";
import { createSystemAdminEditEvent } from "./events";
import type { Actor } from "./mutations";
import {
    COUNSELING_SELECT,
    HOME_VISIT_SELECT,
    toCounselingRecord,
    toHomeVisitRecord,
} from "./care-records-selects";
import { staleCareRecordResponse } from "./care-records-concurrency";

export { getStudentCareRecords } from "./care-records-read";
export { softDeleteSystemCareRecord } from "./care-records-delete";
export { resetSystemActivityProgress } from "./care-records-activity-reset";
export { resetSystemPhqResult } from "./care-records-phq-reset";
export {
    deleteSystemReferral,
    saveSystemPhqResult,
    saveSystemReferral,
} from "./care-records-admin";

export async function saveSystemCounselingRecord(
    input: SystemCounselingEditInput,
    actor: Actor,
): Promise<SystemEditResponse<SystemCounselingRecord>> {
    const existing = input.id
        ? await prisma.counselingSession.findFirst({
              where: { id: input.id, studentId: input.studentId, deletedAt: null },
              select: COUNSELING_SELECT,
          })
        : null;
    if (input.id && !existing) {
        return { success: false, message: "ไม่พบบันทึกการให้คำปรึกษา" };
    }
    if (input.id && !input.expectedUpdatedAt) return staleCareRecordResponse();

    const result = await runSerializableTransaction(async (tx) => {
        if (existing) return updateCounseling(tx, existing, input, actor);
        return createCounseling(tx, input, actor);
    });
    if (!result) return staleCareRecordResponse();

    revalidateCareRecordPaths(result.student.schoolId, result.studentId);
    return {
        success: true,
        message: "บันทึกการให้คำปรึกษาสำเร็จ",
        updated: toCounselingRecord(result),
    };
}

export async function saveSystemHomeVisitRecord(
    input: SystemHomeVisitEditInput,
    actor: Actor,
): Promise<SystemEditResponse<SystemHomeVisitRecord>> {
    const existing = input.id
        ? await prisma.homeVisit.findFirst({
              where: { id: input.id, studentId: input.studentId, deletedAt: null },
              select: HOME_VISIT_SELECT,
          })
        : null;
    if (input.id && !existing) {
        return { success: false, message: "ไม่พบบันทึกการเยี่ยมบ้าน" };
    }
    if (input.id && !input.expectedUpdatedAt) return staleCareRecordResponse();

    const result = await runSerializableTransaction(async (tx) => {
        if (existing) return updateHomeVisit(tx, existing, input, actor);
        return createHomeVisit(tx, input, actor);
    });
    if (!result) return staleCareRecordResponse();

    revalidateCareRecordPaths(result.student.schoolId, result.studentId);
    return {
        success: true,
        message: "บันทึกการเยี่ยมบ้านสำเร็จ",
        updated: toHomeVisitRecord(result),
    };
}

async function updateCounseling(
    tx: Prisma.TransactionClient,
    existing: CounselingRow,
    input: SystemCounselingEditInput,
    actor: Actor,
): Promise<CounselingRow | null> {
    const changes = [
        createChange("sessionDate", "วันที่", existing.sessionDate, input.sessionDate),
        createChange("counselorName", "ผู้ให้คำปรึกษา", existing.counselorName, input.counselorName),
        createChange("summary", "สรุป", existing.summary, input.summary),
    ].filter(isChange);
    if (changes.length === 0) return existing;

    const write = await tx.counselingSession.updateMany({
        where: { id: existing.id, updatedAt: input.expectedUpdatedAt },
        data: {
            sessionDate: input.sessionDate,
            counselorName: input.counselorName,
            summary: input.summary,
        },
    });
    if (write.count !== 1) return null;
    const updated = await tx.counselingSession.findUniqueOrThrow({
        where: { id: existing.id },
        select: COUNSELING_SELECT,
    });
    await createSystemAdminEditEvent({
        tx,
        targetType: "counselingSession",
        targetId: updated.id,
        targetLabel: `ปรึกษาครั้งที่ ${updated.sessionNumber}`,
        reason: input.reason,
        actor,
        changes,
    });
    return updated;
}

async function createCounseling(
    tx: Prisma.TransactionClient,
    input: SystemCounselingEditInput,
    actor: Actor,
): Promise<CounselingRow> {
    const sessionNumber = await getNextCounselingNumber(tx, input.studentId);
    const created = await tx.counselingSession.create({
        data: {
            studentId: input.studentId,
            sessionNumber,
            sessionDate: input.sessionDate,
            counselorName: input.counselorName,
            summary: input.summary,
            createdById: actor.id,
        },
        select: COUNSELING_SELECT,
    });
    await createSystemAdminEditEvent({
        tx,
        targetType: "counselingSession",
        targetId: created.id,
        targetLabel: `ปรึกษาครั้งที่ ${created.sessionNumber}`,
        action: "CREATE",
        reason: input.reason,
        actor,
        changes: [{ field: "record", label: "เพิ่มบันทึก", before: null, after: "created" }],
    });
    return created;
}

async function updateHomeVisit(
    tx: Prisma.TransactionClient,
    existing: HomeVisitRow,
    input: SystemHomeVisitEditInput,
    actor: Actor,
): Promise<HomeVisitRow | null> {
    const nextScheduledDate = input.nextScheduledDate || null;
    const changes = [
        createChange("visitDate", "วันที่เยี่ยมบ้าน", existing.visitDate, input.visitDate),
        createChange("description", "รายละเอียด", existing.description, input.description),
        createChange("nextScheduledDate", "นัดครั้งถัดไป", existing.nextScheduledDate, nextScheduledDate),
        createChange("teacherName", "ครูเจ้าของรายการ", existing.teacherName, input.teacherName),
        createChange("teacherRole", "บทบาทครู", existing.teacherRole, input.teacherRole),
    ].filter(isChange);
    if (changes.length === 0) return existing;

    const write = await tx.homeVisit.updateMany({
        where: { id: existing.id, updatedAt: input.expectedUpdatedAt },
        data: {
            visitDate: input.visitDate,
            description: input.description,
            nextScheduledDate,
            teacherName: input.teacherName,
            teacherRole: input.teacherRole,
        },
    });
    if (write.count !== 1) return null;
    const updated = await tx.homeVisit.findUniqueOrThrow({
        where: { id: existing.id },
        select: HOME_VISIT_SELECT,
    });
    await createSystemAdminEditEvent({
        tx,
        targetType: "homeVisit",
        targetId: updated.id,
        targetLabel: `เยี่ยมบ้านครั้งที่ ${updated.visitNumber}`,
        reason: input.reason,
        actor,
        changes,
    });
    return updated;
}

async function createHomeVisit(
    tx: Prisma.TransactionClient,
    input: SystemHomeVisitEditInput,
    actor: Actor,
): Promise<HomeVisitRow> {
    const visitNumber = await getNextHomeVisitNumber(tx, input.studentId);
    const created = await tx.homeVisit.create({
        data: {
            studentId: input.studentId,
            visitNumber,
            visitDate: input.visitDate,
            description: input.description,
            nextScheduledDate: input.nextScheduledDate || null,
            teacherName: input.teacherName,
            teacherRole: input.teacherRole,
            createdById: actor.id,
        },
        select: HOME_VISIT_SELECT,
    });
    await createSystemAdminEditEvent({
        tx,
        targetType: "homeVisit",
        targetId: created.id,
        targetLabel: `เยี่ยมบ้านครั้งที่ ${created.visitNumber}`,
        action: "CREATE",
        reason: input.reason,
        actor,
        changes: [{ field: "record", label: "เพิ่มบันทึก", before: null, after: "created" }],
    });
    return created;
}

async function getNextCounselingNumber(
    tx: Prisma.TransactionClient,
    studentId: string,
): Promise<number> {
    const last = await tx.counselingSession.findFirst({
        where: { studentId },
        orderBy: { sessionNumber: "desc" },
        select: { sessionNumber: true },
    });
    return (last?.sessionNumber ?? 0) + 1;
}

async function getNextHomeVisitNumber(
    tx: Prisma.TransactionClient,
    studentId: string,
): Promise<number> {
    const last = await tx.homeVisit.findFirst({
        where: { studentId },
        orderBy: { visitNumber: "desc" },
        select: { visitNumber: true },
    });
    return (last?.visitNumber ?? 0) + 1;
}

function revalidateCareRecordPaths(schoolId: string, studentId: string): void {
    revalidateStudentsCache(schoolId, studentId);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/admin/system");
}

async function runSerializableTransaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await prisma.$transaction(work, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            });
        } catch (error) {
            if (!isRetryableNumberConflict(error) || attempt === 2) throw error;
            await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
        }
    }
    throw new Error("Serializable transaction retry exhausted");
}

function isRetryableNumberConflict(error: unknown): boolean {
    if (!error || typeof error !== "object" || !("code" in error)) return false;
    const code = error.code;
    return code === "P2002" || code === "P2034";
}

function createChange(
    field: string,
    label: string,
    before: string | number | boolean | Date | null,
    after: string | number | boolean | Date | null,
): Change | null {
    const previous = serializeValue(before);
    const next = serializeValue(after);
    if (previous === next) return null;
    return { field, label, before: previous, after: next };
}

function serializeValue(value: string | number | boolean | Date | null) {
    return value instanceof Date ? value.toISOString() : value;
}

function isChange(change: Change | null): change is Change {
    return change !== null;
}

type Change = {
    field: string;
    label: string;
    before: string | number | boolean | null;
    after: string | number | boolean | null;
};

type CounselingRow = Prisma.CounselingSessionGetPayload<{
    select: typeof COUNSELING_SELECT;
}>;

type HomeVisitRow = Prisma.HomeVisitGetPayload<{
    select: typeof HOME_VISIT_SELECT;
}>;
