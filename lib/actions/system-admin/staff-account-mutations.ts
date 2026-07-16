import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { deleteFilesByUrl } from "@/lib/actions/data-management/file-storage";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import { deleteUserSessionCaches } from "@/lib/auth/session-cache";
import { invalidateUserSessionCaches } from "@/lib/auth/session-store";
import { prisma } from "@/lib/database/prisma";
import { logError } from "@/lib/utils/logging";
import type {
    SystemStaffAccountActionInput,
    SystemStaffAccountPermanentDeleteInput,
} from "@/lib/validations/system-admin.validation";
import type { MutationResponse } from "@/types/user-management.types";
import type { Actor } from "./mutations";
import { createStaffAccountEvent } from "./staff-account-audit";
import {
    preserveCareHistoryAndDeleteAccountData,
    type StaffDeleteImpact,
} from "./staff-account-impact";

type Tx = Prisma.TransactionClient;
type StaffAccountTarget = NonNullable<
    Awaited<ReturnType<typeof getStaffAccountTarget>>
>;

const STAFF_STALE_MESSAGE =
    "ข้อมูลบัญชีถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่";

class StaffLifecycleConflictError extends Error {}

export async function restoreSystemStaffAccount(
    input: SystemStaffAccountActionInput,
    actor: Actor,
): Promise<MutationResponse> {
    const result = await prisma.$transaction(async (tx) => {
        const target = await getStaffAccountTarget(tx, input.id);
        if (!target) return failure("ไม่พบบัญชีบุคลากร");
        const error = validateRestoreTarget(target);
        if (error) return error;

        const update = await tx.user.updateMany({
            where: { id: target.id, updatedAt: input.expectedUpdatedAt },
            data: { deletedAt: null },
        });
        if (update.count !== 1) return failure(STAFF_STALE_MESSAGE);
        await createStaffAccountEvent({
            tx,
            target,
            reason: input.reason,
            actor,
            operation: "restore",
        });
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
    let transactionResult;
    try {
        transactionResult = await prisma.$transaction(async (tx) => {
            const target = await getStaffAccountTarget(tx, input.id);
            if (!target) return { response: failure("ไม่พบบัญชีบุคลากร") };
            const error = validatePermanentDeleteTarget(target, input.confirmation);
            if (error) return { response: error };

            const impact = await preserveCareHistoryAndDeleteAccountData(tx, target);
            await createStaffAccountEvent({
                tx,
                target,
                reason: input.reason,
                actor,
                operation: "permanent-delete",
                impact: impact.counts,
            });
            const deleted = await tx.user.deleteMany({
                where: { id: target.id, updatedAt: input.expectedUpdatedAt },
            });
            if (deleted.count !== 1) throw new StaffLifecycleConflictError();
            return {
                response: {
                    success: true,
                    message: `ลบถาวรบัญชี ${target.email} สำเร็จ`,
                } satisfies MutationResponse,
                impact,
            };
        });
    } catch (error) {
        if (error instanceof StaffLifecycleConflictError) {
            return failure(STAFF_STALE_MESSAGE);
        }
        throw error;
    }

    if (!transactionResult.response.success || !transactionResult.impact) {
        return transactionResult.response;
    }
    await applyStaffDeleteImpact(transactionResult.impact);
    return transactionResult.response;
}

export async function closeSystemStaffAccount(
    input: SystemStaffAccountActionInput,
    actor: Actor,
): Promise<MutationResponse> {
    const deletedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
        const target = await getStaffAccountTarget(tx, input.id);
        if (!target) return failure("ไม่พบบัญชีบุคลากร");
        const error = validateCloseTarget(target);
        if (error) return error;

        const update = await tx.user.updateMany({
            where: {
                id: target.id,
                updatedAt: input.expectedUpdatedAt,
                deletedAt: null,
            },
            data: { deletedAt },
        });
        if (update.count !== 1) return failure(STAFF_STALE_MESSAGE);
        const sessions = await tx.userSession.updateMany({
            where: { userId: target.id, revokedAt: null },
            data: { revokedAt: deletedAt },
        });
        await createStaffAccountEvent({
            tx,
            target,
            reason: input.reason,
            actor,
            operation: "close",
            deletedAtAfter: deletedAt,
            sessionRevokedCount: sessions.count,
        });
        return {
            success: true,
            message: `ปิดบัญชี ${target.email} สำเร็จ`,
        } satisfies MutationResponse;
    });

    if (result.success) await revalidateClosedStaffAccount(input.id);
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
            updatedAt: true,
            password: true,
            schoolId: true,
            school: { select: { disabledAt: true } },
            teacher: { select: { id: true } },
        },
    });
}

function validateRestoreTarget(
    target: StaffAccountTarget,
): MutationResponse | null {
    if (target.role === "system_admin") return failure("ไม่สามารถกู้คืน System Admin");
    if (!target.deletedAt) return failure("บัญชีนี้ยังเปิดใช้งานอยู่");
    if (target.school?.disabledAt) {
        return failure("ต้องกู้คืนโรงเรียนก่อนจึงจะกู้คืนบัญชีบุคลากรได้");
    }
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

async function applyStaffDeleteImpact(impact: StaffDeleteImpact): Promise<void> {
    try {
        const warnings = await deleteFilesByUrl(impact.fileUrls);
        if (warnings.length > 0) logError("Staff delete file cleanup warnings:", warnings);
    } catch (error) {
        logError("Staff delete file cleanup failed:", error);
    }
    await invalidateUserSessionCaches(impact.userId);
    for (const studentId of impact.studentIds) {
        revalidateStudentsCache(impact.schoolId ?? undefined, studentId);
    }
    await revalidateAnalyticsCache(impact.schoolId ?? undefined);
    revalidateDashboardCache();
    revalidatePath("/admin/system");
    revalidatePath("/admin/users");
}

async function revalidateStaffAccount(userId: string): Promise<void> {
    await deleteUserSessionCaches(userId);
    revalidateDashboardCache();
    revalidatePath("/admin/system");
    revalidatePath("/admin/users");
}

async function revalidateClosedStaffAccount(userId: string): Promise<void> {
    await invalidateUserSessionCaches(userId);
    revalidateDashboardCache();
    revalidatePath("/admin/system");
    revalidatePath("/admin/users");
}

function validateCloseTarget(
    target: StaffAccountTarget,
): MutationResponse | null {
    if (target.role === "system_admin") return failure("ไม่สามารถปิดบัญชี System Admin");
    if (target.isPrimary) return failure("ไม่สามารถปิดบัญชี Primary Admin");
    if (target.deletedAt) return failure("ผู้ใช้นี้ถูกลบแล้ว");
    return null;
}

function failure(message: string): MutationResponse {
    return { success: false, message };
}
