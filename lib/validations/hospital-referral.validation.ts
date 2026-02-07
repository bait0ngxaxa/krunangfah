import { z } from "zod";

export const toggleHospitalReferralSchema = z.object({
    phqResultId: z.string().uuid("Invalid PHQ result ID"),
});

export type ToggleHospitalReferralInput = z.infer<typeof toggleHospitalReferralSchema>;
