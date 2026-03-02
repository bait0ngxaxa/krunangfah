import { z } from "zod";
import { Building2, LayoutGrid, Users, ClipboardCheck } from "lucide-react";

/** Normalize school name: trim → remove space after "โรงเรียน" → add prefix if missing */
function normalizeSchoolName(raw: string): string {
    let name = raw.trim();
    if (name.startsWith("โรงเรียน ")) {
        name = "โรงเรียน" + name.slice("โรงเรียน ".length).trimStart();
    }
    if (!name.startsWith("โรงเรียน")) {
        name = "โรงเรียน" + name;
    }
    return name;
}

export const schoolInfoSchema = z.object({
    name: z
        .string()
        .min(1, "กรุณากรอกชื่อโรงเรียน")
        .max(200, "ชื่อโรงเรียนยาวเกินไป")
        .transform(normalizeSchoolName),
    province: z.string().max(100, "ชื่อจังหวัดยาวเกินไป").optional(),
});

export type SchoolInfoData = z.infer<typeof schoolInfoSchema>;

export const STEPS = [
    { label: "ข้อมูลโรงเรียน", icon: Building2 },
    { label: "ห้องเรียน", icon: LayoutGrid },
    { label: "รายชื่อครู", icon: Users },
    { label: "สรุป", icon: ClipboardCheck },
] as const;
