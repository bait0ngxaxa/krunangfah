import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import { prisma } from "@/lib/database/prisma";
import {
    calculateRiskLevel,
    canReferPhqToHospital,
} from "@/lib/utils/phq-scoring";
import type {
    SystemEditResponse,
    SystemPhqRecord,
    SystemReferralRecord,
} from "./types";
import type {
    SystemCareRecordDeleteInput,
    SystemPhqEditInput,
    SystemReferralEditInput,
} from "@/lib/validations/system-admin.validation";
import { createSystemAdminEditEvent } from "./events";
import type { Actor } from "./mutations";
import {
    PHQ_SELECT,
    REFERRAL_SELECT,
    toPhqRecord,
    toReferralRecord,
} from "./care-records-selects";
import { staleCareRecordResponse } from "./care-records-concurrency";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";
import {
    isLatestPhqResult,
    LATEST_CARE_RECORD_ONLY_MESSAGE,
} from "./care-record-current-policy";

export async function saveSystemPhqResult(
    input: SystemPhqEditInput,
    actor: Actor,
): Promise<SystemEditResponse<SystemPhqRecord>> {
    const existing = await prisma.phqResult.findUnique({
        where: { id: input.id },
        select: PHQ_SELECT,
    });
    if (!existing) return { success: false, message: "ไม่พบผลคัดกรอง" };

    const scores = toScores(input);
    const calculated = calculateRiskLevel(scores);
    const canReferToHospital = canReferPhqToHospital(scores);
    if (input.referredToHospital && !canReferToHospital) {
        return {
            success: false,
            message: "แก้ไขการส่งต่อโรงพยาบาลได้เฉพาะ PHQ สีแดง (เสี่ยงสูงมาก)",
        };
    }

    const referredToHospital = input.referredToHospital && canReferToHospital;
    const hospitalName = referredToHospital
        ? input.hospitalName?.trim() ?? null
        : null;
    const changes = createChanges([
        ["q1", "ข้อ 1", existing.q1, input.q1],
        ["q2", "ข้อ 2", existing.q2, input.q2],
        ["q3", "ข้อ 3", existing.q3, input.q3],
        ["q4", "ข้อ 4", existing.q4, input.q4],
        ["q5", "ข้อ 5", existing.q5, input.q5],
        ["q6", "ข้อ 6", existing.q6, input.q6],
        ["q7", "ข้อ 7", existing.q7, input.q7],
        ["q8", "ข้อ 8", existing.q8, input.q8],
        ["q9", "ข้อ 9", existing.q9, input.q9],
        ["q9a", "คิดทำร้ายตัวเอง", existing.q9a, input.q9a],
        ["q9b", "เคยพยายามทำร้ายตัวเอง", existing.q9b, input.q9b],
        ["totalScore", "คะแนนรวม", existing.totalScore, calculated.totalScore],
        ["riskLevel", "ระดับความเสี่ยง", existing.riskLevel, calculated.riskLevel],
        ["referredToHospital", "ส่งต่อโรงพยาบาล", existing.referredToHospital, referredToHospital],
        ["hospitalName", "โรงพยาบาล", existing.hospitalName, hospitalName],
    ]);
    const transactionResult = await runSerializableTransaction(async (tx) => {
        const latestPhq = await findLatestPhqForStudent(tx, existing.studentId);
        if (!isLatestPhqResult(latestPhq?.id, existing.id)) {
            return { status: "not-latest" } as const;
        }
        if (changes.length === 0) return { status: "unchanged", row: existing } as const;
        const write = await tx.phqResult.updateMany({
            where: { id: existing.id, updatedAt: input.expectedUpdatedAt },
            data: {
                ...scores,
                totalScore: calculated.totalScore,
                riskLevel: calculated.riskLevel,
                referredToHospital,
                hospitalName,
            },
        });
        if (write.count !== 1) return { status: "stale" } as const;
        const row = await tx.phqResult.findUniqueOrThrow({
            where: { id: existing.id },
            select: PHQ_SELECT,
        });
        await createSystemAdminEditEvent({
            tx,
            targetType: "phqResult",
            targetId: row.id,
            targetLabel: `PHQ รอบ ${row.assessmentRound}`,
            reason: input.reason,
            actor,
            changes,
        });
        return { status: "updated", row } as const;
    });
    if (transactionResult.status === "not-latest") {
        return { success: false, message: LATEST_CARE_RECORD_ONLY_MESSAGE };
    }
    if (transactionResult.status === "stale") return staleCareRecordResponse();
    if (transactionResult.status === "unchanged") {
        return {
            success: true,
            message: "ไม่มีข้อมูลเปลี่ยนแปลง",
            updated: toPhqRecord(transactionResult.row),
        };
    }

    const updated = transactionResult.row;
    await revalidateCarePaths(updated.student.schoolId, updated.studentId);
    return { success: true, message: "แก้ไขผลคัดกรองสำเร็จ", updated: toPhqRecord(updated) };
}

export async function saveSystemReferral(
    input: SystemReferralEditInput,
    actor: Actor,
): Promise<SystemEditResponse<SystemReferralRecord>> {
    const student = await prisma.student.findUnique({
        where: { id: input.studentId },
        select: { id: true, schoolId: true },
    });
    if (!student) return { success: false, message: "ไม่พบนักเรียน" };

    const toTeacher = await findTeacherInSchool(input.toTeacherUserId, student.schoolId);
    if (!toTeacher) return { success: false, message: "ไม่พบครูปลายทางในโรงเรียนเดียวกัน" };

    const existing = await prisma.studentReferral.findUnique({
        where: { studentId: student.id },
        select: REFERRAL_SELECT,
    });
    const changes = createChanges([
        ["toTeacherUserId", "ครูผู้รับดูแล", existing?.toTeacherUserId ?? null, input.toTeacherUserId],
        ["fromTeacherUserId", "ผู้แก้ไขรายการ", existing?.fromTeacherUserId ?? null, actor.id],
    ]);

    const updated = await prisma.$transaction(async (tx) => {
        const row = existing
            ? await updateReferral(tx, existing.id, input, actor)
            : await tx.studentReferral.create({
                  data: { studentId: student.id, fromTeacherUserId: actor.id, toTeacherUserId: input.toTeacherUserId },
                  select: REFERRAL_SELECT,
              });
        if (!row) return null;
        await createSystemAdminEditEvent({
            tx,
            targetType: "studentReferral",
            targetId: row.id,
            targetLabel: "การส่งต่อนักเรียน",
            action: existing ? "EDIT" : "CREATE",
            reason: input.reason,
            actor,
            changes: changes.length > 0 ? changes : [{ field: "record", label: "ยืนยันรายการ", before: null, after: "updated" }],
        });
        return row;
    });
    if (!updated) return staleCareRecordResponse();

    await revalidateCarePaths(student.schoolId, student.id);
    return { success: true, message: "บันทึกการส่งต่อสำเร็จ", updated: toReferralRecord(updated) };
}

export async function deleteSystemReferral(
    input: SystemCareRecordDeleteInput,
    actor: Actor,
): Promise<SystemEditResponse<null>> {
    const existing = await prisma.studentReferral.findUnique({
        where: { id: input.id },
        select: REFERRAL_SELECT,
    });
    if (!existing) return { success: false, message: "ไม่พบการส่งต่อ" };

    const deleted = await prisma.$transaction(async (tx) => {
        const write = await tx.studentReferral.deleteMany({
            where: { id: existing.id, updatedAt: input.expectedUpdatedAt },
        });
        if (write.count !== 1) return false;
        await createSystemAdminEditEvent({
            tx,
            targetType: "studentReferral",
            targetId: existing.id,
            targetLabel: "การส่งต่อนักเรียน",
            action: "DELETE",
            reason: input.reason,
            actor,
            changes: [{ field: "record", label: "ลบการส่งต่อ", before: "active", after: null }],
        });
        return true;
    });
    if (!deleted) return staleCareRecordResponse();

    await revalidateCarePaths(existing.student.schoolId, existing.studentId);
    return { success: true, message: "ลบการส่งต่อแล้ว" };
}

function toScores(input: SystemPhqEditInput) {
    const { q1, q2, q3, q4, q5, q6, q7, q8, q9, q9a, q9b } = input;
    return { q1, q2, q3, q4, q5, q6, q7, q8, q9, q9a, q9b };
}

async function updateReferral(
    tx: Prisma.TransactionClient,
    id: string,
    input: SystemReferralEditInput,
    actor: Actor,
) {
    if (!input.expectedUpdatedAt) return null;
    const write = await tx.studentReferral.updateMany({
        where: { id, updatedAt: input.expectedUpdatedAt },
        data: { fromTeacherUserId: actor.id, toTeacherUserId: input.toTeacherUserId },
    });
    if (write.count !== 1) return null;
    return tx.studentReferral.findUniqueOrThrow({ where: { id }, select: REFERRAL_SELECT });
}

async function findTeacherInSchool(userId: string, schoolId: string) {
    return prisma.teacher.findFirst({
        where: { userId, user: { schoolId, deletedAt: null } },
        select: { userId: true },
    });
}

async function findLatestPhqForStudent(tx: Prisma.TransactionClient, studentId: string) {
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


async function revalidateCarePaths(schoolId: string, studentId: string): Promise<void> {
    revalidateStudentsCache(schoolId, studentId);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/admin/system");
    await revalidateAnalyticsCache(schoolId);
}

function createChanges(items: ChangeTuple[]): Change[] {
    return items.map(([field, label, before, after]) => createChange(field, label, before, after)).filter(isChange);
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

type ChangeTuple = [
    string,
    string,
    string | number | boolean | Date | null,
    string | number | boolean | Date | null,
];
