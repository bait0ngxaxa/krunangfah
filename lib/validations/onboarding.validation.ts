import { z } from "zod";
import { ONBOARDING_PROGRESS_STATUSES } from "@/types/onboarding.types";

export const onboardingProgressSchema = z.object({
    status: z.enum(ONBOARDING_PROGRESS_STATUSES),
});

export type OnboardingProgressData = z.infer<
    typeof onboardingProgressSchema
>;
