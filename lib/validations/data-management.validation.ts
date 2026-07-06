import { z } from "zod";

const reasonSchema = z
    .string()
    .trim()
    .min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร")
    .max(1000, "เหตุผลยาวเกินไป");

export const dataManagementSearchSchema = z.object({
    query: z.string().trim().max(100, "คำค้นหายาวเกินไป").optional(),
    targetType: z.enum(["all", "school", "student"]).default("all"),
    dataState: z.enum(["all", "active", "disabled", "test"]).default("all"),
    schoolId: z.string().trim().max(100).optional(),
    province: z.string().trim().max(100).optional(),
});

export const dataManagementReasonSchema = z.object({
    id: z.string().cuid("รหัสข้อมูลไม่ถูกต้อง"),
    reason: reasonSchema,
});

export const dataManagementTargetSchema = z.enum(["school", "student"]);

export const dataManagementActionSchema = z.enum([
    "mark-test",
    "unmark-test",
    "disable",
    "restore",
    "permanent-delete",
]);

export type DataManagementSearchInput = z.infer<
    typeof dataManagementSearchSchema
>;
export type DataManagementReasonInput = z.infer<
    typeof dataManagementReasonSchema
>;
export type DataManagementTargetInput = z.infer<
    typeof dataManagementTargetSchema
>;
export type DataManagementActionInput = z.infer<
    typeof dataManagementActionSchema
>;
