import { z } from "zod";

export const createReferralSchema = z.object({
    studentId: z.string().cuid("Invalid student ID"),
    toTeacherUserId: z.string().cuid("Invalid teacher user ID"),
});

export type CreateReferralInput = z.infer<typeof createReferralSchema>;

export const revokeReferralSchema = z.object({
    referralId: z.string().cuid("Invalid referral ID"),
});

export type RevokeReferralInput = z.infer<typeof revokeReferralSchema>;
