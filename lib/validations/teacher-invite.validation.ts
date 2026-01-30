import { z } from "zod";

export const PROJECT_ROLE_VALUES = ["lead", "care", "coordinate"] as const;
export const USER_ROLE_VALUES = ["school_admin", "class_teacher"] as const;

export const teacherInviteSchema = z.object({
    email: z.string().email("อีเมลไม่ถูกต้อง"),
    firstName: z.string().min(1, "กรุณากรอกชื่อ"),
    lastName: z.string().min(1, "กรุณากรอกสกุล"),
    age: z
        .string()
        .min(1, "กรุณากรอกอายุ")
        .refine(
            (val) => {
                const num = Number(val);
                return !isNaN(num) && num >= 20 && num <= 100;
            },
            { message: "อายุต้องอยู่ระหว่าง 20-100 ปี" },
        ),
    userRole: z.enum(USER_ROLE_VALUES, {
        message: "กรุณาเลือกประเภทครู",
    }),
    advisoryClass: z.string().min(1, "กรุณากรอกชั้นที่ปรึกษา"),
    academicYearId: z.string().min(1, "กรุณาเลือกปีการศึกษา"),
    schoolRole: z.string().min(1, "กรุณากรอกบทบาทในโรงเรียน"),
    projectRole: z.enum(PROJECT_ROLE_VALUES, {
        message: "กรุณาเลือกบทบาทในโครงการ",
    }),
});

export type TeacherInviteFormData = z.infer<typeof teacherInviteSchema>;

export const acceptInviteSchema = z
    .object({
        token: z.string().min(1),
        password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "รหัสผ่านไม่ตรงกัน",
        path: ["confirmPassword"],
    });

export type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;
