import { z } from "zod";

export const PROBLEM_TYPES = ["internal", "external"] as const;

export const submitAssessmentSchema = z.object({
    activityProgressId: z.string().uuid("Invalid activity progress ID"),
    internalProblems: z.string().min(1, "กรุณากรอกปัญหาภายใน"),
    externalProblems: z.string().min(1, "กรุณากรอกปัญหาภายนอก"),
    problemType: z.enum(PROBLEM_TYPES),
});

export const scheduleActivitySchema = z.object({
    activityProgressId: z.string().uuid("Invalid activity progress ID"),
    scheduledDate: z.date(),
    teacherId: z.string().uuid("Invalid teacher ID"),
    teacherNotes: z.string().optional(),
});

export const updateTeacherNotesSchema = z.object({
    activityProgressId: z.string().uuid("Invalid activity progress ID"),
    notes: z.string().min(1, "กรุณากรอกบันทึก"),
});

export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;
export type ScheduleActivityInput = z.infer<typeof scheduleActivitySchema>;
export type UpdateTeacherNotesInput = z.infer<typeof updateTeacherNotesSchema>;
