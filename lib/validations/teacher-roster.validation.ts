import { z } from "zod";
import { UserRole, ProjectRole } from "@prisma/client";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import { sanitizeName, sanitizeText } from "@/lib/utils/text-sanitizer";

// ดึง enum values จาก Prisma โดยตรง — ไม่ hardcode
const projectRoleValues = Object.values(ProjectRole) as [string, ...string[]];
const userRoleValues = [UserRole.school_admin, UserRole.class_teacher] as [
    string,
    ...string[],
];

export const ADMIN_ADVISORY_CLASS = "ทุกห้อง";

export const teacherRosterSchema = z
    .object({
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
        email: z.string().email("อีเมลไม่ถูกต้อง").optional().or(z.literal("")),
        age: z
            .number({ error: "กรุณากรอกอายุเป็นตัวเลข" })
            .min(18, "อายุต้องมากกว่า 18 ปี")
            .max(100, "อายุไม่ถูกต้อง"),
        userRole: z.enum(userRoleValues as [string, ...string[]], {
            message: "กรุณาเลือกประเภทครู",
        }),
        advisoryClass: z
            .string()
            .max(INPUT_LIMITS.teacher.advisoryClass, "ชั้นที่ปรึกษายาวเกินไป"),
        schoolRole: z
            .string()
            .min(1, "กรุณากรอกบทบาทในโรงเรียน")
            .max(INPUT_LIMITS.teacher.schoolRole, "บทบาทหน้าที่ยาวเกินไป")
            .transform(sanitizeText),
        projectRole: z.enum(projectRoleValues as [string, ...string[]], {
            message: "กรุณาเลือกบทบาทในโครงการ",
        }),
    })
    .refine(
        (data) => {
            if (data.userRole === "class_teacher") {
                return data.advisoryClass.trim().length > 0;
            }
            return true;
        },
        {
            message: "กรุณาเลือกห้องที่ปรึกษา",
            path: ["advisoryClass"],
        },
    );

export type TeacherRosterFormData = z.infer<typeof teacherRosterSchema>;
