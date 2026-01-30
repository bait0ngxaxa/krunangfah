import { z } from "zod";

export const projectRoles = ["lead", "care", "coordinate"] as const;

export const teacherProfileSchema = z.object({
    firstName: z.string().min(1, "กรุณากรอกชื่อ"),
    lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
    age: z.number().min(18, "อายุต้องมากกว่า 18 ปี").max(100, "อายุไม่ถูกต้อง"),
    schoolName: z.string().min(1, "กรุณากรอกชื่อโรงเรียน"),
    advisoryClass: z.string().min(1, "กรุณากรอกชั้นที่ปรึกษา"),
    academicYearId: z.string().min(1, "กรุณาเลือกปีการศึกษา"),
    schoolRole: z.string().min(1, "กรุณากรอกบทบาทหน้าที่ในโรงเรียน"),
    projectRole: z.enum(projectRoles, { message: "กรุณาเลือกบทบาทในโครงการ" }),
});

export type TeacherProfileFormData = z.infer<typeof teacherProfileSchema>;
