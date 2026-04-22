import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";

export const createHomeVisitSchema = z.object({
    studentId: z.string().cuid("Invalid student ID"),
    visitDate: z.coerce.date(),
    description: z
        .string()
        .min(1, "กรุณากรอกรายละเอียดการเยี่ยมบ้าน")
        .max(INPUT_LIMITS.homeVisit.description, "รายละเอียดการเยี่ยมบ้านยาวเกินไป"),
    nextScheduledDate: z.coerce.date().optional(),
});

export const deleteHomeVisitSchema = z.object({
    visitId: z.string().cuid("Invalid visit ID"),
});

export type CreateHomeVisitInput = z.infer<typeof createHomeVisitSchema>;
export type DeleteHomeVisitInput = z.infer<typeof deleteHomeVisitSchema>;
