"use server";

import { handleActionError } from "@/lib/actions/error-handler";
import {
    permanentlyDeleteSystemStaffAccount,
    restoreSystemStaffAccount,
} from "@/lib/actions/system-admin/staff-account-mutations";
import { requireAdmin } from "@/lib/auth/session";
import {
    getSystemAdminValidationMessage,
    systemStaffAccountActionSchema,
    systemStaffAccountPermanentDeleteSchema,
} from "@/lib/validations/system-admin.validation";
import type { MutationResponse } from "@/types/user-management.types";
import type { Actor } from "./system-admin/mutations";

export async function restoreSystemAdminStaffAccount(
    input: unknown,
): Promise<MutationResponse> {
    try {
        const parsed = systemStaffAccountActionSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error);
        const session = await requireAdmin();
        return restoreSystemStaffAccount(parsed.data, toActor(session));
    } catch (error) {
        return handleActionError({
            context: "restoreSystemAdminStaffAccount error:",
            error,
            fallback: { success: false, message: "กู้คืนบัญชีไม่สำเร็จ" },
        });
    }
}

export async function permanentlyDeleteSystemAdminStaffAccount(
    input: unknown,
): Promise<MutationResponse> {
    try {
        const parsed = systemStaffAccountPermanentDeleteSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error);
        const session = await requireAdmin();
        return permanentlyDeleteSystemStaffAccount(parsed.data, toActor(session));
    } catch (error) {
        return handleActionError({
            context: "permanentlyDeleteSystemAdminStaffAccount error:",
            error,
            fallback: { success: false, message: "ลบถาวรบัญชีไม่สำเร็จ" },
        });
    }
}

function invalidInput(
    error: Parameters<typeof getSystemAdminValidationMessage>[0],
): MutationResponse {
    return {
        success: false,
        message: getSystemAdminValidationMessage(error, "ข้อมูลไม่ถูกต้อง"),
    };
}

function toActor(session: Awaited<ReturnType<typeof requireAdmin>>): Actor {
    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
    };
}
