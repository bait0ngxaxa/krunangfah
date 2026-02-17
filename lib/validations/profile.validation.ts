/**
 * Validation schemas for User Profile Settings
 */

import { z } from "zod";
import { projectRoles } from "./teacher.validation";

/**
 * Profile update schema (excludes schoolName to prevent school changes)
 * School information cannot be edited to maintain data integrity
 */
export const profileUpdateSchema = z.object({
    firstName: z.string().min(1, "กรุณากรอกชื่อ"),
    lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
    age: z.number().min(18, "อายุต้องมากกว่า 18 ปี").max(100, "อายุไม่ถูกต้อง"),
    advisoryClass: z.string().min(1, "กรุณากรอกชั้นที่ปรึกษา"),
    academicYearId: z.string().min(1, "กรุณาเลือกปีการศึกษา"),
    schoolRole: z.string().min(1, "กรุณากรอกบทบาทหน้าที่ในโรงเรียน"),
    projectRole: z.enum(projectRoles, { message: "กรุณาเลือกบทบาทในโครงการ" }),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

/**
 * Password change schema with current password verification
 */
export const passwordChangeSchema = z
    .object({
        currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
        newPassword: z
            .string()
            .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "รหัสผ่านไม่ตรงกัน",
        path: ["confirmPassword"],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม",
        path: ["newPassword"],
    });

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
