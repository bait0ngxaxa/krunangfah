import { z } from "zod";
import { ProjectRole } from "@prisma/client";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import { sanitizeName, sanitizeText } from "@/lib/utils/text-sanitizer";

export const systemEntityTypes = [
    "all",
    "school",
    "staff",
    "student",
] as const;

export const systemSearchSchema = z.object({
    query: z.string().trim().min(2).max(100),
    entityType: z.enum(systemEntityTypes).default("all"),
});

const reasonSchema = z
    .string()
    .trim()
    .min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร")
    .max(1000, "เหตุผลยาวเกินไป");

export const systemSchoolEditSchema = z.object({
    id: z.string().cuid("รหัสโรงเรียนไม่ถูกต้อง"),
    name: z.string().trim().min(1, "กรุณาระบุชื่อโรงเรียน").max(200),
    province: z.string().trim().max(100).optional(),
    reason: reasonSchema,
});

export const systemStudentEditSchema = z.object({
    id: z.string().cuid("รหัสนักเรียนไม่ถูกต้อง"),
    studentId: z.string().trim().min(1, "กรุณาระบุรหัสนักเรียน").max(50),
    nationalId: z
        .string()
        .trim()
        .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก")
        .optional()
        .or(z.literal("")),
    firstName: z.string().trim().min(1, "กรุณาระบุชื่อนักเรียน").max(100),
    lastName: z.string().trim().min(1, "กรุณาระบุนามสกุล").max(100),
    gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
    age: z.coerce.number().int().min(1).max(120).optional().or(z.literal("")),
    class: z.string().trim().min(1, "กรุณาระบุห้องเรียน").max(50),
    status: z.enum(["ACTIVE", "RESIGNED", "TRANSFERRED", "GRADUATED"]),
    reason: reasonSchema,
});

export const systemTeacherProfileEditSchema = z.object({
    id: z.string().cuid("รหัสบัญชีครูไม่ถูกต้อง"),
    firstName: z
        .string()
        .min(1, "กรุณากรอกชื่อ")
        .max(INPUT_LIMITS.teacher.firstName, "ชื่อยาวเกินไป")
        .transform(sanitizeName),
    lastName: z
        .string()
        .min(1, "กรุณากรอกนามสกุล")
        .max(INPUT_LIMITS.teacher.lastName, "นามสกุลยาวเกินไป")
        .transform(sanitizeName),
    age: z.coerce
        .number({ error: "กรุณากรอกอายุเป็นตัวเลข" })
        .int("กรุณากรอกอายุเป็นจำนวนเต็ม")
        .min(18, "อายุต้องมากกว่า 18 ปี")
        .max(100, "อายุไม่ถูกต้อง"),
    schoolRole: z
        .string()
        .min(1, "กรุณากรอกบทบาทหน้าที่ในโรงเรียน")
        .max(INPUT_LIMITS.teacher.schoolRole, "บทบาทหน้าที่ยาวเกินไป")
        .transform(sanitizeText),
    projectRole: z.enum(ProjectRole, {
        message: "กรุณาเลือกบทบาทในโครงการ",
    }),
    reason: reasonSchema,
});

export const systemStudentCareRecordsSchema = z.object({
    studentId: z.string().cuid("รหัสนักเรียนไม่ถูกต้อง"),
});

export const systemCounselingEditSchema = z.object({
    id: z.string().cuid("รหัสบันทึกไม่ถูกต้อง").optional(),
    studentId: z.string().cuid("รหัสนักเรียนไม่ถูกต้อง"),
    sessionDate: z.coerce.date(),
    counselorName: z.string().trim().min(1).max(100),
    summary: z.string().trim().min(1).max(5000),
    reason: reasonSchema,
});

export const systemHomeVisitEditSchema = z.object({
    id: z.string().cuid("รหัสบันทึกไม่ถูกต้อง").optional(),
    studentId: z.string().cuid("รหัสนักเรียนไม่ถูกต้อง"),
    visitDate: z.coerce.date(),
    description: z.string().trim().min(1).max(5000),
    nextScheduledDate: z.coerce.date().optional().or(z.literal("")),
    teacherName: z.string().trim().min(1).max(200),
    teacherRole: z.string().trim().min(1).max(200),
    reason: reasonSchema,
});

const phqScoreSchema = z.coerce.number().int().min(0).max(3);

export const systemPhqEditSchema = z
    .object({
        id: z.string().cuid("รหัส PHQ ไม่ถูกต้อง"),
        q1: phqScoreSchema,
        q2: phqScoreSchema,
        q3: phqScoreSchema,
        q4: phqScoreSchema,
        q5: phqScoreSchema,
        q6: phqScoreSchema,
        q7: phqScoreSchema,
        q8: phqScoreSchema,
        q9: phqScoreSchema,
        q9a: z.boolean(),
        q9b: z.boolean(),
        referredToHospital: z.boolean(),
        hospitalName: z.string().trim().max(200).optional().or(z.literal("")),
        reason: reasonSchema,
    })
    .superRefine((value, context) => {
        if (value.referredToHospital && !value.hospitalName?.trim()) {
            context.addIssue({
                code: "custom",
                path: ["hospitalName"],
                message: "กรุณาระบุชื่อโรงพยาบาล",
            });
        }
    });

export const systemReferralEditSchema = z.object({
    studentId: z.string().cuid("รหัสนักเรียนไม่ถูกต้อง"),
    toTeacherUserId: z.string().cuid("รหัสครูปลายทางไม่ถูกต้อง"),
    reason: reasonSchema,
});

export const systemCareRecordDeleteSchema = z.object({
    id: z.string().cuid("รหัสบันทึกไม่ถูกต้อง"),
    reason: reasonSchema,
});

export function getSystemAdminValidationMessage(
    error: z.ZodError,
    fallback: string,
): string {
    const issue = error.issues[0];
    if (!issue) return fallback;
    return issue.message || fallback;
}

export type SystemSearchInput = z.infer<typeof systemSearchSchema>;
export type SystemEntityType = SystemSearchInput["entityType"];
export type SystemSchoolEditInput = z.infer<typeof systemSchoolEditSchema>;
export type SystemStudentEditInput = z.infer<typeof systemStudentEditSchema>;
export type SystemTeacherProfileEditInput = z.infer<
    typeof systemTeacherProfileEditSchema
>;
export type SystemStudentCareRecordsInput = z.infer<
    typeof systemStudentCareRecordsSchema
>;
export type SystemCounselingEditInput = z.infer<
    typeof systemCounselingEditSchema
>;
export type SystemHomeVisitEditInput = z.infer<
    typeof systemHomeVisitEditSchema
>;
export type SystemPhqEditInput = z.infer<typeof systemPhqEditSchema>;
export type SystemReferralEditInput = z.infer<typeof systemReferralEditSchema>;
export type SystemCareRecordDeleteInput = z.infer<
    typeof systemCareRecordDeleteSchema
>;
