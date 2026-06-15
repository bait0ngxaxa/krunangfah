import { Gender, StudentStatus } from "@prisma/client";
import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import { sanitizeName, sanitizeText } from "@/lib/utils/text-sanitizer";

export const studentProfileUpdateSchema = z
    .object({
        studentId: z
            .string()
            .min(1, "กรุณากรอกรหัสนักเรียน")
            .max(INPUT_LIMITS.student.studentId, "รหัสนักเรียนยาวเกินไป")
            .transform(sanitizeText),
        nationalId: z
            .string()
            .transform((value) => sanitizeText(value).replace(/\D/g, ""))
            .refine(
                (value) => value === "" || /^\d{13}$/.test(value),
                "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก",
            )
            .transform((value) => (value === "" ? null : value)),
        firstName: z
            .string()
            .min(1, "กรุณากรอกชื่อ")
            .max(INPUT_LIMITS.student.firstName, "ชื่อยาวเกินไป")
            .transform(sanitizeName),
        lastName: z
            .string()
            .min(1, "กรุณากรอกนามสกุล")
            .max(INPUT_LIMITS.student.lastName, "นามสกุลยาวเกินไป")
            .transform(sanitizeName),
        gender: z.enum(Gender, { message: "เพศไม่ถูกต้อง" }).nullable(),
        age: z
            .number({ error: "กรุณากรอกอายุเป็นตัวเลข" })
            .int("อายุต้องเป็นจำนวนเต็ม")
            .min(1, "อายุไม่ถูกต้อง")
            .max(INPUT_LIMITS.student.age, "อายุไม่ถูกต้อง")
            .nullable(),
        class: z
            .string()
            .min(1, "กรุณากรอกห้องเรียน")
            .max(INPUT_LIMITS.student.className, "ห้องเรียนยาวเกินไป")
            .transform(sanitizeText),
        status: z.enum(StudentStatus, {
            message: "สถานะนักเรียนไม่ถูกต้อง",
        }),
    })
    .strict();

export type StudentProfileUpdateInput = z.infer<
    typeof studentProfileUpdateSchema
>;
