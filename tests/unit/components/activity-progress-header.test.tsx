import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivityProgressHeader } from "@/components/student/activity/ActivityProgressTable/ActivityProgressHeader";

const defaultProps = {
    studentId: "student-1",
    phqResultId: "phq-1",
    riskLevel: "green" as const,
    completedCount: 2,
    totalCount: 3,
    assessmentPeriod: {
        academicYear: 2569,
        semester: 1,
        assessmentRound: 1,
    },
};

describe("ActivityProgressHeader", () => {
    it("shows the start button while activities remain", () => {
        const markup = renderToStaticMarkup(
            <ActivityProgressHeader {...defaultProps} isComplete={false} />,
        );

        expect(markup).toContain("ทำกิจกรรม");
    });

    it("hides the start button when the activity sequence is complete", () => {
        const markup = renderToStaticMarkup(
            <ActivityProgressHeader
                {...defaultProps}
                completedCount={3}
                isComplete
            />,
        );

        expect(markup).not.toContain("ทำกิจกรรม");
    });
});
