import type {
    OnboardingStatus,
    SchoolSetupStep,
} from "@/types/onboarding.types";

/**
 * Map persisted onboarding state to the first step shown by the wizard.
 * A user without a school must always start at the school information step.
 */
export function getInitialSchoolSetupStep(
    hasSchool: boolean,
    status: OnboardingStatus,
): SchoolSetupStep {
    if (!hasSchool) return 0;

    switch (status) {
        case "CLASSES_PENDING":
            return 2;
        case "ROSTER_PENDING":
            return 3;
        case "SCHOOL_CREATED":
        case "PROFILE_REQUIRED":
        case "COMPLETED":
        default:
            return 1;
    }
}

/**
 * Return the durable state that represents a school setup step.
 * Step 0 is persisted by createSchoolAndLink, so it has no transition here.
 */
export function getOnboardingStatusForStep(
    step: SchoolSetupStep,
): OnboardingStatus | null {
    switch (step) {
        case 1:
            return "SCHOOL_CREATED";
        case 2:
            return "CLASSES_PENDING";
        case 3:
            return "ROSTER_PENDING";
        case 0:
        default:
            return null;
    }
}
