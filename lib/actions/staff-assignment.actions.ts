"use server";

import { requireAuth } from "@/lib/auth/session";
import {
    staffAssignmentCommandSchema,
    type StaffAssignmentCommandInput,
} from "@/lib/validations/staff-assignment.validation";
import {
    executeStaffAssignmentCommand,
    type StaffAssignmentCommand,
} from "@/lib/services/staff-assignment-command";
import type { MutationResponse } from "@/types/user-management.types";

export async function updateStaffAssignment(
    input: unknown,
): Promise<MutationResponse> {
    const parsed = staffAssignmentCommandSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, message: "ข้อมูลการจัดการบุคลากรไม่ถูกต้อง" };
    }

    const session = await requireAuth();
    return executeStaffAssignmentCommand(
        toCommand(parsed.data),
        session.user,
    );
}

function toCommand(input: StaffAssignmentCommandInput): StaffAssignmentCommand {
    return {
        userId: input.userId,
        roleSelection: input.roleSelection,
        advisoryClass: input.advisoryClass,
        togglePrimary: input.togglePrimary,
        reason: input.reason,
    };
}
