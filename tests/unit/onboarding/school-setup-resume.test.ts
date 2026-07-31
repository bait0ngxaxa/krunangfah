import { describe, expect, it } from "vitest";
import {
    getInitialSchoolSetupStep,
    getOnboardingStatusForStep,
} from "@/lib/onboarding/school-setup-resume";

describe("school setup onboarding resume state", () => {
    it("starts at school information when no school exists", () => {
        expect(getInitialSchoolSetupStep(false, "PROFILE_REQUIRED")).toBe(0);
    });

    it.each([
        ["SCHOOL_CREATED", 1],
        ["CLASSES_PENDING", 2],
        ["ROSTER_PENDING", 3],
    ] as const)("resumes %s at step %s", (status, expectedStep) => {
        expect(getInitialSchoolSetupStep(true, status)).toBe(expectedStep);
    });

    it("maps editable steps back to durable onboarding statuses", () => {
        expect(getOnboardingStatusForStep(0)).toBeNull();
        expect(getOnboardingStatusForStep(1)).toBe("SCHOOL_CREATED");
        expect(getOnboardingStatusForStep(2)).toBe("CLASSES_PENDING");
        expect(getOnboardingStatusForStep(3)).toBe("ROSTER_PENDING");
    });
});
