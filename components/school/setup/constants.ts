import { Building2, LayoutGrid, Users, ClipboardCheck } from "lucide-react";

export {
    schoolInfoSchema,
    type SchoolInfoData,
} from "@/lib/validations/school.validation";

export const STEPS = [
    { label: "ข้อมูลโรงเรียน", icon: Building2 },
    { label: "ห้องเรียน", icon: LayoutGrid },
    { label: "รายชื่อครู", icon: Users },
    { label: "สรุป", icon: ClipboardCheck },
] as const;
