import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import { sanitizeName, sanitizeText } from "@/lib/utils/text-sanitizer";

export const projectRoles = ["lead", "care", "coordinate"] as const;

export const teacherProfileSchema = z.object({
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
    age: z
        .number({ error: "กรุณากรอกอายุเป็นตัวเลข" })
        .min(18, "อายุต้องมากกว่า 18 ปี")
        .max(100, "อายุไม่ถูกต้อง"),
    advisoryClass: z
        .string()
        .min(1, "กรุณากรอกชั้นที่ปรึกษา")
        .max(INPUT_LIMITS.teacher.advisoryClass, "ชั้นที่ปรึกษายาวเกินไป"),
    academicYearId: z.string().min(1, "กรุณาเลือกปีการศึกษา"),
    schoolRole: z
        .string()
        .min(1, "กรุณากรอกบทบาทหน้าที่ในโรงเรียน")
        .max(INPUT_LIMITS.teacher.schoolRole, "บทบาทหน้าที่ยาวเกินไป")
        .transform(sanitizeText),
    projectRole: z.enum(projectRoles, { message: "กรุณาเลือกบทบาทในโครงการ" }),
});

export type TeacherProfileFormData = z.infer<typeof teacherProfileSchema>;
