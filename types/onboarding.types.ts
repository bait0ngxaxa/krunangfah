import type { OnboardingStatus as PrismaOnboardingStatus } from "@prisma/client";

export type OnboardingStatus = PrismaOnboardingStatus;

export const ONBOARDING_PROGRESS_STATUSES = [
    "SCHOOL_CREATED",
    "CLASSES_PENDING",
    "ROSTER_PENDING",
] as const satisfies readonly OnboardingStatus[];

export type SchoolSetupStep = 0 | 1 | 2 | 3;

export interface OnboardingActionResponse {
    success: boolean;
    message: string;
}
