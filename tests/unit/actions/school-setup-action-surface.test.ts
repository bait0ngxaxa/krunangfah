import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database/prisma", () => ({ prisma: {} }));

const schoolSetupActions = await import("@/lib/actions/school-setup.actions");

describe("school setup Server Action surface", () => {
    it("exports only viewer-authorized public Server Actions", () => {
        expect(Object.keys(schoolSetupActions).sort()).toEqual([
            "addSchoolClass",
            "createSchoolAndLink",
            "getSchoolClasses",
            "removeSchoolClass",
            "updateSchoolClassStudentCount",
        ]);
    });
});
