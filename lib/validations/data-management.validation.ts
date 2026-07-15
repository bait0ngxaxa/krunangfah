import { z } from "zod";

const reasonSchema = z
    .string({ error: "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร" })
    .trim()
    .min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร")
    .max(1000, "เหตุผลยาวเกินไป");

export const dataManagementSearchSchema = z.object({
    query: z.string().trim().max(100, "คำค้นหายาวเกินไป").optional(),
    targetType: z.enum(["all", "school", "student"]).default("all"),
    dataState: z.enum(["all", "active", "disabled", "test"]).default("all"),
    schoolId: z.string().trim().max(100).optional(),
    province: z.string().trim().max(100).optional(),
    schoolCursor: z.string().cuid("cursor โรงเรียนไม่ถูกต้อง").optional(),
    studentCursor: z.string().cuid("cursor นักเรียนไม่ถูกต้อง").optional(),
});

export const dataManagementReasonSchema = z.object({
    id: z.string().cuid("รหัสข้อมูลไม่ถูกต้อง"),
    reason: reasonSchema,
});

export const dataManagementPermanentDeleteSchema = z.object({
    id: z.string().cuid("รหัสข้อมูลไม่ถูกต้อง"),
    reason: reasonSchema,
    expectedUpdatedAt: z.coerce.date(),
    expectedImpactFingerprint: z
        .string({ error: "ไม่พบรหัสตรวจสอบผลกระทบล่าสุด" })
        .regex(/^[a-f0-9]{64}$/, "รหัสตรวจสอบผลกระทบไม่ถูกต้อง"),
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
export type DataManagementPermanentDeleteInput = z.infer<
    typeof dataManagementPermanentDeleteSchema
>;
export type DataManagementTargetInput = z.infer<
    typeof dataManagementTargetSchema
>;
export type DataManagementActionInput = z.infer<
    typeof dataManagementActionSchema
>;
