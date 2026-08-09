import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";

export const COUNSELING_ACADEMIC_YEAR_DATE_ERROR_MESSAGE =
    "วันที่ให้คำปรึกษาต้องอยู่ในช่วงปี/เทอมที่เลือก";

export const counselingSessionSchema = z.object({
    studentId: z.string().cuid("Invalid student ID"),
    academicYearId: z.string().cuid("Invalid academic year ID").optional(),
    sessionDate: z.coerce.date(),
    counselorName: z
        .string()
        .min(1, "กรุณากรอกชื่อผู้ให้คำปรึกษา")
        .max(INPUT_LIMITS.counseling.counselorName, "ชื่อผู้ให้คำปรึกษายาวเกินไป"),
    summary: z
        .string()
        .min(1, "กรุณากรอกบันทึกการให้คำปรึกษา")
        .max(INPUT_LIMITS.counseling.summary, "บันทึกการให้คำปรึกษายาวเกินไป"),
});

export const updateCounselingSessionSchema = z.object({
    sessionId: z.string().cuid("Invalid session ID"),
    sessionDate: z.coerce.date(),
    counselorName: z
        .string()
        .min(1, "กรุณากรอกชื่อผู้ให้คำปรึกษา")
        .max(INPUT_LIMITS.counseling.counselorName, "ชื่อผู้ให้คำปรึกษายาวเกินไป"),
    summary: z
        .string()
        .min(1, "กรุณากรอกบันทึกการให้คำปรึกษา")
        .max(INPUT_LIMITS.counseling.summary, "บันทึกการให้คำปรึกษายาวเกินไป"),
});

export const deleteCounselingSessionSchema = z.object({
    sessionId: z.string().cuid("Invalid session ID"),
});

export type CounselingSessionInput = z.infer<typeof counselingSessionSchema>;
export type UpdateCounselingSessionInput = z.infer<typeof updateCounselingSessionSchema>;
export type DeleteCounselingSessionInput = z.infer<typeof deleteCounselingSessionSchema>;
