import { z } from "zod";

export const signInSchema = z.object({
    email: z.string().email("อีเมลไม่ถูกต้อง"),
    password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const signUpSchema = z
    .object({
        email: z.string().email("อีเมลไม่ถูกต้อง"),
        password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "รหัสผ่านไม่ตรงกัน",
        path: ["confirmPassword"],
    });

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().email("อีเมลไม่ถูกต้อง"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
    .object({
        token: z.string().min(1, "ไม่พบ token"),
        password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "รหัสผ่านไม่ตรงกัน",
        path: ["confirmPassword"],
    });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
