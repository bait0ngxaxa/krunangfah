import { z } from "zod";

import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import { normalizeClassName } from "@/lib/utils/class-normalizer";

import type { NamedSubmissionFilters } from "./types";

const optionalYearSchema = z
    .string()
    .regex(/^\d{4}$/, "ปีการศึกษาไม่ถูกต้อง")
    .transform(Number)
    .optional();

const optionalSemesterSchema = z
    .enum(["1", "2"], { message: "เทอมไม่ถูกต้อง" })
    .transform(Number)
    .optional();

const optionalRoundSchema = z
    .enum(["1", "2"], { message: "รอบคัดกรองไม่ถูกต้อง" })
    .transform(Number)
    .optional();

export const namedSubmissionFiltersSchema = z.object({
    school: z.string().cuid("รหัสโรงเรียนไม่ถูกต้อง").optional(),
    class: z
        .string()
        .trim()
        .min(1, "ห้องเรียนไม่ถูกต้อง")
        .max(INPUT_LIMITS.student.className, "ชื่อห้องเรียนยาวเกินไป")
        .transform(normalizeClassName)
        .optional(),
    year: optionalYearSchema,
    semester: optionalSemesterSchema,
    round: optionalRoundSchema,
});

export function parseNamedSubmissionFilters(input: unknown):
    | { success: true; data: NamedSubmissionFilters }
    | { success: false } {
    const result = namedSubmissionFiltersSchema.safeParse(input);

    if (!result.success) {
        return { success: false };
    }

    return {
        success: true,
        data: {
            schoolId: result.data.school,
            className: result.data.class,
            academicYear: result.data.year,
            semester: result.data.semester,
            assessmentRound: result.data.round,
        },
    };
}
