import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { deleteUserSessionCaches } from "@/lib/auth/session-cache";
import { prisma } from "@/lib/database/prisma";
import type {
    SystemStaffAccountActionInput,
    SystemStaffAccountPermanentDeleteInput,
} from "@/lib/validations/system-admin.validation";
import type { MutationResponse } from "@/types/user-management.types";
import { createSystemAdminEditEvent } from "./events";
import type { Actor } from "./mutations";

type Tx = Prisma.TransactionClient;
type StaffAccountTarget = NonNullable<
    Awaited<ReturnType<typeof getStaffAccountTarget>>
>;

export async function restoreSystemStaffAccount(
    input: SystemStaffAccountActionInput,
    actor: Actor,
): Promise<MutationResponse> {
    const result = await prisma.$transaction(async (tx) => {
        const target = await getStaffAccountTarget(tx, input.id);
        if (!target) return failure("ไม่พบบัญชีบุคลากร");
        const error = validateRestoreTarget(target);
        if (error) return error;

        await tx.user.update({
            where: { id: target.id },
            data: { deletedAt: null },
        });
        await createAccountEvent(tx, target, input.reason, actor, "restore");
        return {
            success: true,
            message: target.password
                ? "กู้คืนบัญชีสำเร็จ"
                : "กู้คืนบัญชีสำเร็จ ผู้ใช้ต้องตั้งรหัสผ่านใหม่ก่อนเข้าใช้งาน",
        } satisfies MutationResponse;
    });

    if (result.success) await revalidateStaffAccount(input.id);
    return result;
}

export async function permanentlyDeleteSystemStaffAccount(
    input: SystemStaffAccountPermanentDeleteInput,
    actor: Actor,
): Promise<MutationResponse> {
    const result = await prisma.$transaction(async (tx) => {
        const target = await getStaffAccountTarget(tx, input.id);
        if (!target) return failure("ไม่พบบัญชีบุคลากร");
        const error = validatePermanentDeleteTarget(target, input.confirmation);
        if (error) return error;

        await deleteStaffAccountDependents(tx, target);
        await createAccountEvent(tx, target, input.reason, actor, "permanent-delete");
        await tx.user.delete({ where: { id: target.id } });
        return {
            success: true,
            message: `ลบถาวรบัญชี ${target.email} สำเร็จ`,
        } satisfies MutationResponse;
    });

    if (result.success) await revalidateStaffAccount(input.id);
    return result;
}

function getStaffAccountTarget(tx: Tx, id: string) {
    return tx.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isPrimary: true,
            deletedAt: true,
            password: true,
            teacher: { select: { id: true } },
        },
    });
}

function validateRestoreTarget(
    target: StaffAccountTarget,
): MutationResponse | null {
    if (target.role === "system_admin") return failure("ไม่สามารถกู้คืน System Admin");
    if (!target.deletedAt) return failure("บัญชีนี้ยังเปิดใช้งานอยู่");
    return null;
}

function validatePermanentDeleteTarget(
    target: StaffAccountTarget,
    confirmation: string,
): MutationResponse | null {
    if (target.role === "system_admin") return failure("ไม่สามารถลบ System Admin");
    if (target.isPrimary) return failure("ไม่สามารถลบ Primary Admin");
    if (!target.deletedAt) return failure("ต้องปิดบัญชีก่อนลบถาวร");
    if (confirmation.trim().toLowerCase() !== target.email.toLowerCase()) {
        return failure("อีเมลยืนยันไม่ตรงกับบัญชีที่ต้องการลบ");
    }
    return null;
}

async function deleteStaffAccountDependents(
    tx: Tx,
    target: StaffAccountTarget,
): Promise<void> {
    await deleteStaffLeafRecords(tx, target);
    await Promise.all([
        tx.activityProgress.deleteMany({
            where: {
                OR: [
                    { teacherId: target.id },
                    { phqResult: { importedById: target.id } },
                ],
            },
        }),
        tx.homeVisit.deleteMany({ where: { createdById: target.id } }),
    ]);
    await tx.phqResult.deleteMany({ where: { importedById: target.id } });
    await tx.teacher.deleteMany({ where: { userId: target.id } });
}

async function deleteStaffLeafRecords(
    tx: Tx,
    target: StaffAccountTarget,
): Promise<void> {
    await Promise.all([
        deleteStaffInvites(tx, target),
        tx.userSession.deleteMany({ where: { userId: target.id } }),
        tx.passwordResetToken.deleteMany({ where: { email: target.email } }),
        tx.schoolTeacherRoster.deleteMany({ where: { email: target.email } }),
        tx.worksheetUpload.deleteMany({
            where: {
                OR: [
                    { uploadedById: target.id },
                    { activityProgress: { teacherId: target.id } },
                    {
                        activityProgress: {
                            phqResult: { importedById: target.id },
                        },
                    },
                ],
            },
        }),
        tx.counselingSession.deleteMany({ where: { createdById: target.id } }),
        tx.studentReferral.deleteMany({
            where: {
                OR: [
                    { fromTeacherUserId: target.id },
                    { toTeacherUserId: target.id },
                ],
            },
        }),
        tx.homeVisitPhoto.deleteMany({
            where: { homeVisit: { createdById: target.id } },
        }),
    ]);
}

async function deleteStaffInvites(
    tx: Tx,
    target: StaffAccountTarget,
): Promise<void> {
    await Promise.all([
        tx.teacherInvite.deleteMany({
            where: {
                OR: [{ invitedById: target.id }, { email: target.email }],
            },
        }),
        tx.schoolAdminInvite.deleteMany({
            where: {
                OR: [{ createdBy: target.id }, { email: target.email }],
            },
        }),
    ]);
}

async function createAccountEvent(
    tx: Tx,
    target: StaffAccountTarget,
    reason: string,
    actor: Actor,
    operation: "restore" | "permanent-delete",
): Promise<void> {
    const isRestore = operation === "restore";
    await createSystemAdminEditEvent({
        tx,
        targetType: "user",
        targetId: target.id,
        targetLabel: target.name ?? target.email,
        action: isRestore ? "EDIT" : "DELETE",
        reason,
        actor,
        changes: [{
            field: "accountStatus",
            label: "สถานะบัญชี",
            before: "ปิดใช้งาน",
            after: isRestore ? "เปิดใช้งาน" : "ลบถาวร",
        }],
    });
}

async function revalidateStaffAccount(userId: string): Promise<void> {
    await deleteUserSessionCaches(userId);
    revalidateDashboardCache();
    revalidatePath("/admin/system");
    revalidatePath("/admin/users");
}

function failure(message: string): MutationResponse {
    return { success: false, message };
}
