import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import { normalizeSchoolName, sanitizeText } from "@/lib/utils/text-sanitizer";

export const schoolInfoSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "กรุณากรอกชื่อโรงเรียน")
        .max(INPUT_LIMITS.school.name, "ชื่อโรงเรียนยาวเกินไป")
        .transform(normalizeSchoolName),
    province: z
        .string()
        .max(INPUT_LIMITS.school.province, "ชื่อจังหวัดยาวเกินไป")
        .transform(sanitizeText)
        .optional(),
});

export type SchoolInfoData = z.infer<typeof schoolInfoSchema>;
