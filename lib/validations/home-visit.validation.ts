import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";

export const HOME_VISIT_NEXT_SCHEDULED_DATE_ERROR_MESSAGE =
    "วันนัดครั้งถัดไปต้องไม่ก่อนวันที่เยี่ยมบ้าน";
export const HOME_VISIT_ACADEMIC_YEAR_DATE_ERROR_MESSAGE =
    "วันที่เยี่ยมบ้านต้องอยู่ในช่วงปี/เทอมที่เลือก";

export function isNextScheduledDateOnOrAfterVisit(
    visitDate: Date,
    nextScheduledDate: Date | "" | undefined,
): boolean {
    return (
        nextScheduledDate === undefined ||
        nextScheduledDate === "" ||
        nextScheduledDate >= visitDate
    );
}

export const createHomeVisitSchema = z
    .object({
        studentId: z.string().cuid("Invalid student ID"),
        academicYearId: z.string().cuid("Invalid academic year ID").optional(),
        visitDate: z.coerce.date(),
        description: z
            .string()
            .min(1, "กรุณากรอกรายละเอียดการเยี่ยมบ้าน")
            .max(INPUT_LIMITS.homeVisit.description, "รายละเอียดการเยี่ยมบ้านยาวเกินไป"),
        nextScheduledDate: z.coerce.date().optional(),
    })
    .refine(
        (data) =>
            isNextScheduledDateOnOrAfterVisit(
                data.visitDate,
                data.nextScheduledDate,
            ),
        {
            message: HOME_VISIT_NEXT_SCHEDULED_DATE_ERROR_MESSAGE,
            path: ["nextScheduledDate"],
        },
    );

export const deleteHomeVisitSchema = z.object({
    visitId: z.string().cuid("Invalid visit ID"),
});

export type CreateHomeVisitInput = z.infer<typeof createHomeVisitSchema>;
export type DeleteHomeVisitInput = z.infer<typeof deleteHomeVisitSchema>;
