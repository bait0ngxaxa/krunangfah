import { z } from "zod";

export const counselingSessionSchema = z.object({
    studentId: z.string().uuid("Invalid student ID"),
    sessionDate: z.coerce.date(),
    counselorName: z.string().min(1, "กรุณากรอกชื่อผู้ให้คำปรึกษา"),
    summary: z.string().min(1, "กรุณากรอกบันทึกการให้คำปรึกษา"),
});

export const updateCounselingSessionSchema = z.object({
    sessionId: z.string().uuid("Invalid session ID"),
    sessionDate: z.coerce.date(),
    counselorName: z.string().min(1, "กรุณากรอกชื่อผู้ให้คำปรึกษา"),
    summary: z.string().min(1, "กรุณากรอกบันทึกการให้คำปรึกษา"),
});

export const deleteCounselingSessionSchema = z.object({
    sessionId: z.string().uuid("Invalid session ID"),
});

export type CounselingSessionInput = z.infer<typeof counselingSessionSchema>;
export type UpdateCounselingSessionInput = z.infer<typeof updateCounselingSessionSchema>;
export type DeleteCounselingSessionInput = z.infer<typeof deleteCounselingSessionSchema>;
