import { z } from "zod";

export const signInSchema = z.object({
    email: z.string().email("อีเมลไม่ถูกต้อง"),
    password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const signUpSchema = z
    .object({
        name: z.string().min(1, "กรุณากรอกชื่อ"),
        email: z.string().email("อีเมลไม่ถูกต้อง"),
        schoolName: z.string().min(1, "กรุณากรอกชื่อโรงเรียน"),
        password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "รหัสผ่านไม่ตรงกัน",
        path: ["confirmPassword"],
    });

export type SignUpFormData = z.infer<typeof signUpSchema>;
