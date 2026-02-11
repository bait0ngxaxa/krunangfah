import { z } from "zod";

export const whitelistEmailSchema = z.object({
    email: z
        .string()
        .min(1, "กรุณากรอกอีเมล")
        .email("รูปแบบอีเมลไม่ถูกต้อง")
        .transform((val) => val.toLowerCase().trim()),
});

export type WhitelistFormData = z.infer<typeof whitelistEmailSchema>;
