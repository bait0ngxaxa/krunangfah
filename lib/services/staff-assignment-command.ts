import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { invalidateUserSessionCaches } from "@/lib/auth/session-store";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { createSystemAdminEditEvent } from "@/lib/actions/system-admin/events";
import type {
    ChangeableRole,
    MutationResponse,
} from "@/types/user-management.types";
import {
    compareAndSwapTeacher,
    compareAndSwapUser,
    getAssignmentChanges,
    getDesiredAssignment,
    getTargetLabel,
    hasTeacherChange,
    hasUserChange,
    isAllowedActor,
    isTransactionConflict,
    normalizeCommand,
    staffTargetSelect,
    unchanged,
    validateAdvisoryClass,
    validatePrimaryInvariant,
    validateTarget,
    waitBeforeRetry,
} from "./staff-assignment-command-helpers";
import {
    getDefaultReason,
    getNoChangeMessage,
    getSuccessMessage,
} from "./staff-assignment-command-messages";

const MAX_TRANSACTION_RETRIES = 3;
const TRANSACTION_CONFLICT_MESSAGE =
    "ข้อมูลผู้ใช้ถูกแก้ไขโดยผู้ใช้อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่";

export interface StaffAssignmentCommand {
    userId: string;
    roleSelection?: ChangeableRole;
    advisoryClass?: string;
    togglePrimary?: boolean;
    reason?: string;
    expectedUserUpdatedAt?: Date;
}

export interface StaffAssignmentActor {
    id: string;
    email?: string | null;
    name?: string | null;
    role: string;
    isPrimary: boolean;
    schoolId: string | null;
}

interface TransactionOutcome extends MutationResponse {
    changed: boolean;
    isPrimary?: boolean;
}

export async function executeStaffAssignmentCommand(
    input: StaffAssignmentCommand,
    actor: StaffAssignmentActor,
): Promise<MutationResponse & { isPrimary?: boolean }> {
    if (!isAllowedActor(actor)) {
        return { success: false, message: "ไม่มีสิทธิ์แก้ไขข้อมูลบุคลากร" };
    }

    const normalized = normalizeCommand(input);
    if (!normalized.success) return normalized;

    try {
        const result = await runStaffAssignmentTransaction(normalized.value, actor);
        if (!result.success || !result.changed) {
            return { success: result.success, message: result.message };
        }

        await invalidateUserSessionCaches(input.userId);
        revalidateDashboardCache();
        revalidatePath("/admin/system");
        revalidatePath("/school/classes");
        return {
            success: true,
            message: result.message,
            isPrimary: result.isPrimary,
        };
    } catch {
        return {
            success: false,
            message: "ไม่สามารถแก้ไขข้อมูลบุคลากรได้ กรุณาลองใหม่อีกครั้ง",
        };
    }
}

async function runStaffAssignmentTransaction(
    input: StaffAssignmentCommand,
    actor: StaffAssignmentActor,
): Promise<TransactionOutcome> {
    for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
        try {
            return await prisma.$transaction(
                (tx) => applyStaffAssignment(tx, input, actor),
                {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                },
            );
        } catch (error) {
            if (!isTransactionConflict(error)) throw error;
            if (attempt === MAX_TRANSACTION_RETRIES - 1) {
                return {
                    success: false,
                    changed: false,
                    message: TRANSACTION_CONFLICT_MESSAGE,
                };
            }
            await waitBeforeRetry(attempt);
        }
    }

    return {
        success: false,
        changed: false,
        message: TRANSACTION_CONFLICT_MESSAGE,
    };
}

async function applyStaffAssignment(
    tx: Prisma.TransactionClient,
    input: StaffAssignmentCommand,
    actor: StaffAssignmentActor,
): Promise<TransactionOutcome> {
    const target = await tx.user.findUnique({
        where: { id: input.userId },
        select: staffTargetSelect,
    });
    const validationError = validateTarget(target, actor, input);
    if (validationError) return unchanged(validationError);
    if (!target) return unchanged("ไม่พบผู้ใช้งาน");
    if (
        input.expectedUserUpdatedAt &&
        target.updatedAt.getTime() !== input.expectedUserUpdatedAt.getTime()
    ) {
        return unchanged(TRANSACTION_CONFLICT_MESSAGE);
    }

    const decision = getDesiredAssignment(target, input);
    if ("message" in decision) return unchanged(decision.message);
    const desired = decision.desired;
    const teacherChanged = hasTeacherChange(target, desired);
    const userChanged = hasUserChange(target, desired);
    if (!teacherChanged && !userChanged) {
        return unchanged(getNoChangeMessage(input));
    }

    const classError = await validateAdvisoryClass(tx, target, desired);
    if (classError) return unchanged(classError);
    const primaryError = await validatePrimaryInvariant(tx, target, desired);
    if (primaryError) {
        return unchanged(
            input.togglePrimary
                ? "โรงเรียนต้องมี Primary Admin อย่างน้อย 1 คน"
                : primaryError,
        );
    }

    if (userChanged && !(await compareAndSwapUser(tx, target, desired))) {
        return unchanged(TRANSACTION_CONFLICT_MESSAGE);
    }
    if (teacherChanged && !(await compareAndSwapTeacher(tx, target, desired))) {
        return unchanged(TRANSACTION_CONFLICT_MESSAGE);
    }

    await createSystemAdminEditEvent({
        tx,
        targetType: "user",
        targetId: target.id,
        targetLabel: getTargetLabel(target),
        reason: input.reason ?? getDefaultReason(input),
        actor,
        changes: getAssignmentChanges(target, desired),
    });
    return {
        success: true,
        changed: true,
        isPrimary: desired.isPrimary,
        message: getSuccessMessage(input),
    };
}
