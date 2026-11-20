import { Gender } from "@prisma/client";
import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import {
    STUDENT_IDENTIFIER_REASON_MAX_LENGTH,
    STUDENT_IDENTIFIER_REASON_MIN_LENGTH,
} from "@/lib/constants/student-identifier";
import { STUDENT_STATUS_VALUES } from "@/lib/constants/student-status";
import { sanitizeName, sanitizeText } from "@/lib/utils/text-sanitizer";
import {
    isValidNationalId,
    NATIONAL_ID_ERROR_MESSAGE,
    normalizeNationalId,
} from "@/lib/utils/national-id";

export const studentProfileUpdateSchema = z
    .object({
        studentId: z
            .string()
            .min(1, "กรุณากรอกรหัสนักเรียน")
            .max(INPUT_LIMITS.student.studentId, "รหัสนักเรียนยาวเกินไป")
            .transform(sanitizeText),
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
        status: z.enum(STUDENT_STATUS_VALUES, {
            message: "สถานะนักเรียนไม่ถูกต้อง",
        }),
    })
    .strict();

export type StudentProfileUpdateInput = z.infer<
    typeof studentProfileUpdateSchema
>;

export const studentIdentifierUpdateSchema = z.object({
    nationalId: z.string().transform(normalizeNationalId)
        .refine(isValidNationalId, NATIONAL_ID_ERROR_MESSAGE).nullable(),
    expectedUpdatedAt: z.iso.datetime().transform((value) => new Date(value)),
    reason: z.string({ error: "กรุณาระบุเหตุผลที่เปลี่ยนเลขประจำตัว" }).trim()
        .min(STUDENT_IDENTIFIER_REASON_MIN_LENGTH, `กรุณาระบุเหตุผลอย่างน้อย ${STUDENT_IDENTIFIER_REASON_MIN_LENGTH} ตัวอักษร`)
        .max(STUDENT_IDENTIFIER_REASON_MAX_LENGTH, `เหตุผลต้องไม่เกิน ${STUDENT_IDENTIFIER_REASON_MAX_LENGTH} ตัวอักษร`)
        .refine((reason) => !/\d{13}/.test(normalizeNationalId(reason.normalize("NFKC"))),
            "กรุณาระบุเหตุผลโดยไม่ใส่เลขประจำตัว"),
}).strict();
