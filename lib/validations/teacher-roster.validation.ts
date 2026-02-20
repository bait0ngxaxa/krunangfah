import { z } from "zod";
import { UserRole, ProjectRole } from "@prisma/client";

// ดึง enum values จาก Prisma โดยตรง — ไม่ hardcode
const projectRoleValues = Object.values(ProjectRole) as [string, ...string[]];
const userRoleValues = [UserRole.school_admin, UserRole.class_teacher] as [
    string,
    ...string[],
];

export const ADMIN_ADVISORY_CLASS = "ทุกห้อง";

export const teacherRosterSchema = z
    .object({
        firstName: z.string().min(1, "กรุณากรอกชื่อ"),
        lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
        email: z.string().email("อีเมลไม่ถูกต้อง").optional().or(z.literal("")),
        age: z
            .number()
            .min(18, "อายุต้องมากกว่า 18 ปี")
            .max(100, "อายุไม่ถูกต้อง"),
        userRole: z.enum(userRoleValues as [string, ...string[]], {
            message: "กรุณาเลือกประเภทครู",
        }),
        advisoryClass: z.string(),
        schoolRole: z.string().min(1, "กรุณากรอกบทบาทในโรงเรียน"),
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
