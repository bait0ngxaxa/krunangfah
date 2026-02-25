import { z } from "zod";
import { sanitizeName, sanitizeText } from "@/lib/utils/text-sanitizer";

export const projectRoles = ["lead", "care", "coordinate"] as const;

export const teacherProfileSchema = z.object({
    firstName: z
        .string()
        .min(1, "กรุณากรอกชื่อ")
        .max(100, "ชื่อยาวเกินไป")
        .transform(sanitizeName),
    lastName: z
        .string()
        .min(1, "กรุณากรอกนามสกุล")
        .max(100, "นามสกุลยาวเกินไป")
        .transform(sanitizeName),
    age: z.number().min(18, "อายุต้องมากกว่า 18 ปี").max(100, "อายุไม่ถูกต้อง"),
    advisoryClass: z.string().min(1, "กรุณากรอกชั้นที่ปรึกษา"),
    academicYearId: z.string().min(1, "กรุณาเลือกปีการศึกษา"),
    schoolRole: z
        .string()
        .min(1, "กรุณากรอกบทบาทหน้าที่ในโรงเรียน")
        .max(200, "บทบาทหน้าที่ยาวเกินไป")
        .transform(sanitizeText),
    projectRole: z.enum(projectRoles, { message: "กรุณาเลือกบทบาทในโครงการ" }),
});

export type TeacherProfileFormData = z.infer<typeof teacherProfileSchema>;
