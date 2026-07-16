import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { deleteFilesByUrl } from "@/lib/actions/data-management/file-storage";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import { deleteUserSessionCaches } from "@/lib/auth/session-cache";
import { prisma } from "@/lib/database/prisma";
import { logError } from "@/lib/utils/logging";
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

interface StaffDeleteImpact {
    userId: string;
    schoolId: string | null;
    studentIds: string[];
    fileUrls: string[];
}

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
    let transactionResult;
    try {
        transactionResult = await prisma.$transaction(async (tx) => {
            const target = await getStaffAccountTarget(tx, input.id);
            if (!target) return { response: failure("ไม่พบบัญชีบุคลากร") };
            const error = validatePermanentDeleteTarget(target, input.confirmation);
            if (error) return { response: error };

            const impact = await createStaffDeleteImpact(tx, target);
            await preserveCareHistoryAndDeleteAccountData(tx, target);
            await createAccountEvent(tx, target, input.reason, actor, "permanent-delete");
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

async function preserveCareHistoryAndDeleteAccountData(
    tx: Tx,
    target: StaffAccountTarget,
): Promise<void> {
    const actorSnapshot = createStaffSnapshot(target);
    await Promise.all([
        tx.activityProgress.updateMany({
            where: { teacherId: target.id },
            data: { teacherId: null, teacherSnapshot: actorSnapshot },
        }),
        tx.phqResult.updateMany({
            where: { importedById: target.id },
            data: { importedById: null, importedBySnapshot: actorSnapshot },
        }),
        tx.worksheetUpload.updateMany({
            where: { uploadedById: target.id },
            data: { uploadedById: null, uploadedBySnapshot: actorSnapshot },
        }),
        tx.counselingSession.updateMany({
            where: { createdById: target.id },
            data: { createdById: null, createdBySnapshot: actorSnapshot },
        }),
        tx.homeVisit.updateMany({
            where: { createdById: target.id },
            data: { createdById: null, createdBySnapshot: actorSnapshot },
        }),
    ]);
    await deleteStaffAccountData(tx, target);
    await tx.teacher.deleteMany({ where: { userId: target.id } });
}

async function createStaffDeleteImpact(
    tx: Tx,
    target: StaffAccountTarget,
): Promise<StaffDeleteImpact> {
    const where = { OR: [{ fromTeacherUserId: target.id }, { toTeacherUserId: target.id }] };
    const [phqRows, activityRows, worksheetRows, counselingRows, homeVisitRows, referralRows] = await Promise.all([
        tx.phqResult.findMany({ where: { importedById: target.id }, select: { studentId: true } }),
        tx.activityProgress.findMany({ where: { teacherId: target.id }, select: { studentId: true } }),
        tx.worksheetUpload.findMany({
            where: { uploadedById: target.id },
            select: { activityProgress: { select: { studentId: true } } },
        }),
        tx.counselingSession.findMany({ where: { createdById: target.id }, select: { studentId: true } }),
        tx.homeVisit.findMany({ where: { createdById: target.id }, select: { studentId: true } }),
        tx.studentReferral.findMany({ where, select: { studentId: true } }),
    ]);
    const directIds = [phqRows, activityRows, counselingRows, homeVisitRows, referralRows]
        .flatMap((rows) => rows.map((row) => row.studentId));
    const worksheetIds = worksheetRows.map((row) => row.activityProgress.studentId);
    return { userId: target.id, schoolId: target.schoolId, studentIds: [...new Set([...directIds, ...worksheetIds])], fileUrls: [] };
}

async function applyStaffDeleteImpact(impact: StaffDeleteImpact): Promise<void> {
    try {
        const warnings = await deleteFilesByUrl(impact.fileUrls);
        if (warnings.length > 0) logError("Staff delete file cleanup warnings:", warnings);
    } catch (error) {
        logError("Staff delete file cleanup failed:", error);
    }
    await deleteUserSessionCaches(impact.userId);
    for (const studentId of impact.studentIds) {
        revalidateStudentsCache(impact.schoolId ?? undefined, studentId);
    }
    await revalidateAnalyticsCache(impact.schoolId ?? undefined);
    revalidateDashboardCache();
    revalidatePath("/admin/system");
    revalidatePath("/admin/users");
}

async function deleteStaffAccountData(
    tx: Tx,
    target: StaffAccountTarget,
): Promise<void> {
    await Promise.all([
        deleteStaffInvites(tx, target),
        tx.userSession.deleteMany({ where: { userId: target.id } }),
        tx.passwordResetToken.deleteMany({ where: { email: target.email } }),
        tx.schoolTeacherRoster.deleteMany({ where: { email: target.email } }),
        tx.studentReferral.deleteMany({
            where: {
                OR: [
                    { fromTeacherUserId: target.id },
                    { toTeacherUserId: target.id },
                ],
            },
        }),
    ]);
}

function createStaffSnapshot(target: StaffAccountTarget): Prisma.InputJsonObject {
    return {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
    };
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
