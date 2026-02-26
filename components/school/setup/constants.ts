import { z } from "zod";
import {
    Building2,
    LayoutGrid,
    Users,
    ClipboardCheck,
} from "lucide-react";

export const schoolInfoSchema = z.object({
    name: z
        .string()
        .min(1, "กรุณากรอกชื่อโรงเรียน")
        .max(200, "ชื่อโรงเรียนยาวเกินไป"),
    province: z
        .string()
        .max(100, "ชื่อจังหวัดยาวเกินไป")
        .optional(),
});

export type SchoolInfoData = z.infer<typeof schoolInfoSchema>;

export const STEPS = [
    { label: "ข้อมูลโรงเรียน", icon: Building2 },
    { label: "ห้องเรียน", icon: LayoutGrid },
    { label: "รายชื่อครู", icon: Users },
    { label: "สรุป", icon: ClipboardCheck },
] as const;
