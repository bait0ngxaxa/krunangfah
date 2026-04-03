import { describe, expect, it } from "vitest";
import { deriveStudentDashboardView } from "@/components/student/dashboard/student-dashboard-data";
import type { StudentDashboardProps } from "@/components/student/dashboard/types";

function createBaseProps(): StudentDashboardProps {
    return {
        userRole: "system_admin",
        students: [
            {
                id: "s1",
                firstName: "A",
                lastName: "One",
                studentId: "001",
                class: "ม.1/1",
                schoolId: "school-a",
                phqResults: [{ totalScore: 3, riskLevel: "blue" }],
                referral: null,
            },
        ],
        schools: [
            { id: "school-a", name: "School A" },
            { id: "school-b", name: "School B" },
        ],
    };
}

describe("deriveStudentDashboardView", () => {
    it("keeps selected school filter even when selected school has no students", () => {
        const props: StudentDashboardProps = {
            ...createBaseProps(),
            filters: { schoolId: "school-b" },
        };

        const view = deriveStudentDashboardView(props);

        expect(view.selectedSchoolId).toBe("school-b");
        expect(view.showSchoolPrompt).toBe(false);
        expect(view.schoolFilteredStudentCount).toBe(0);
    });

    it("drops selected school when school id does not exist in school options", () => {
        const props: StudentDashboardProps = {
            ...createBaseProps(),
            filters: { schoolId: "school-x" },
        };

        const view = deriveStudentDashboardView(props);

        expect(view.selectedSchoolId).toBe("");
        expect(view.showSchoolPrompt).toBe(true);
    });
});
