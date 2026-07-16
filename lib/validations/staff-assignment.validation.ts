import { z } from "zod";

export const staffAssignmentCommandSchema = z
    .object({
        userId: z.string().trim().min(1).max(100),
        roleSelection: z
            .enum([
                "primary_school_admin",
                "angel_teacher",
                "school_admin",
                "class_teacher",
            ])
            .optional(),
        advisoryClass: z.string().trim().min(1).max(100).optional(),
        togglePrimary: z.boolean().optional(),
        reason: z.string().trim().min(3).max(1000).optional(),
        expectedUserUpdatedAt: z.coerce.date().optional(),
    })
    .refine(
        (input) =>
            [
                input.roleSelection !== undefined,
                input.advisoryClass !== undefined,
                input.togglePrimary === true,
            ].filter(Boolean).length === 1,
        { message: "ต้องระบุบทบาทหรือห้องที่ปรึกษา" },
    );

export type StaffAssignmentCommandInput = z.infer<
    typeof staffAssignmentCommandSchema
>;
