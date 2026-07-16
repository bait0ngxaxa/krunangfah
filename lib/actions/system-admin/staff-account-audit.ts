import type { Prisma } from "@prisma/client";
import type { Actor } from "./mutations";
import { createSystemAdminEditEvent } from "./events";
import type { SystemAdminEditChange } from "./types";
import type { StaffDeleteImpactCounts } from "./staff-account-impact";

type Tx = Prisma.TransactionClient;
type StaffAccountEventOperation = "restore" | "close" | "permanent-delete";

interface StaffAccountAuditTarget {
    id: string;
    email: string;
    name: string | null;
    deletedAt: Date | null;
}

interface CreateStaffAccountEventInput {
    tx: Tx;
    target: StaffAccountAuditTarget;
    reason: string;
    actor: Actor;
    operation: StaffAccountEventOperation;
    deletedAtAfter?: Date | null;
    sessionRevokedCount?: number;
    impact?: StaffDeleteImpactCounts;
}

export async function createStaffAccountEvent(
    input: CreateStaffAccountEventInput,
): Promise<void> {
    await createSystemAdminEditEvent({
        tx: input.tx,
        targetType: "user",
        targetId: input.target.id,
        targetLabel: input.target.name ?? input.target.email,
        action: input.operation === "restore" ? "EDIT" : "DELETE",
        reason: input.reason,
        actor: input.actor,
        changes: createStaffAccountChanges(input),
    });
}

function createStaffAccountChanges(
    input: CreateStaffAccountEventInput,
): SystemAdminEditChange[] {
    const changes: SystemAdminEditChange[] = [
        {
            field: "deletedAt",
            label: "deletedAt",
            before: input.target.deletedAt?.toISOString() ?? null,
            after: getDeletedAtAfter(input),
        },
    ];
    if (input.sessionRevokedCount !== undefined) {
        changes.push({
            field: "sessionRevocation",
            label: "จำนวน session ที่เพิกถอน",
            before: 0,
            after: input.sessionRevokedCount,
        });
    }
    if (input.operation === "permanent-delete") {
        changes.push({
            field: "accountStatus",
            label: "สถานะบัญชี",
            before: "ปิดใช้งาน",
            after: "ลบถาวร",
        });
    }
    if (input.impact) changes.push(...createImpactChanges(input.impact));
    return changes;
}

function getDeletedAtAfter(
    input: CreateStaffAccountEventInput,
): string | null {
    return input.deletedAtAfter?.toISOString() ?? null;
}

function createImpactChanges(
    counts: StaffDeleteImpactCounts,
): SystemAdminEditChange[] {
    const fields: Array<[string, string, number]> = [
        ["impact.studentCount", "นักเรียนที่ได้รับผลกระทบ", counts.studentCount],
        ["impact.phqResultCount", "ผล PHQ ที่เก็บ snapshot", counts.phqResultCount],
        ["impact.activityProgressCount", "ความคืบหน้ากิจกรรมที่เก็บ snapshot", counts.activityProgressCount],
        ["impact.worksheetUploadCount", "ใบงานที่เก็บ snapshot", counts.worksheetUploadCount],
        ["impact.counselingSessionCount", "บันทึกการให้คำปรึกษาที่เก็บ snapshot", counts.counselingSessionCount],
        ["impact.homeVisitCount", "บันทึกเยี่ยมบ้านที่เก็บ snapshot", counts.homeVisitCount],
        ["impact.studentReferralCount", "การส่งต่อที่ลบ", counts.studentReferralCount],
        ["impact.sessionCount", "session ที่ลบ", counts.sessionCount],
        ["impact.teacherInviteCount", "คำเชิญครูที่ลบ", counts.teacherInviteCount],
        ["impact.schoolAdminInviteCount", "คำเชิญผู้ดูแลโรงเรียนที่ลบ", counts.schoolAdminInviteCount],
        ["impact.passwordResetTokenCount", "โทเค็นตั้งรหัสผ่านใหม่ที่ลบ", counts.passwordResetTokenCount],
        ["impact.schoolTeacherRosterCount", "รายชื่อครูล่วงหน้าที่ลบ", counts.schoolTeacherRosterCount],
        ["impact.teacherProfileCount", "โปรไฟล์ครูที่ลบ", counts.teacherProfileCount],
        ["impact.fileCount", "ไฟล์ที่ลบ", counts.fileCount],
    ];
    return fields.map(([field, label, count]) => ({
        field,
        label,
        before: 0,
        after: count,
    }));
}
