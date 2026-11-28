// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RiskGroupSection } from "@/components/student/phq/RiskGroupSection";
import { ScreeningSummary } from "@/components/student/dashboard/components/ScreeningSummary";

const CURRENT_TERM = { id: "term-current", year: 2568, semester: 2 };
const PREVIOUS_TERM = { id: "term-previous", year: 2568, semester: 1 };
const FLAG = "ยังไม่ได้คัดกรองเทอมนี้";

function createStudent(
    id: string,
    academicYear: typeof CURRENT_TERM,
    assessmentRound = 1,
) {
    return {
        id,
        firstName: "นักเรียน",
        lastName: id,
        class: "ม.1/1",
        phqResults: [
            { totalScore: 20, riskLevel: "red", assessmentRound, academicYear },
        ],
        referral: null,
    };
}

function renderSummary(filters: { academicYearId?: string } = {}): string {
    const students = [
        createStudent("previous", PREVIOUS_TERM),
        createStudent("current", CURRENT_TERM, 2),
    ];
    return renderToStaticMarkup(
        <ScreeningSummary
            displayedStudentCount={2}
            filteredStudentCount={2}
            groupedStudents={{ red: students, orange: [], yellow: [], green: [], blue: [] }}
            selectedClass="ม.1/1"
            classes={["ม.1/1"]}
            riskLevels={["red"]}
            riskCounts={{ red: 2, orange: 0, yellow: 0, green: 0, blue: 0 }}
            filters={filters}
            pagination={{ page: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }}
            currentAcademicYearId={CURRENT_TERM.id}
            readOnly
        />,
    );
}

describe("result term on student rows", () => {
    it("renders the result's term and round on each row", () => {
        const markup = renderToStaticMarkup(
            <RiskGroupSection
                level="red"
                students={[createStudent("a", PREVIOUS_TERM)]}
                totalCount={1}
                readOnly
            />,
        );

        expect(markup).toContain("2568/1 รอบ 1");
        expect(markup).not.toContain(FLAG);
    });

    it("flags only results from another term in the default view", () => {
        const markup = renderSummary();

        expect(markup).toContain("2568/1 รอบ 1");
        expect(markup).toContain("2568/2 รอบ 2");
        expect(markup.split(FLAG)).toHaveLength(2);
        const previousRow = markup.slice(
            markup.indexOf("นักเรียน previous"),
            markup.indexOf("นักเรียน current"),
        );
        expect(previousRow).toContain(FLAG);
    });

    it("never flags when a term is selected", () => {
        const markup = renderSummary({ academicYearId: PREVIOUS_TERM.id });

        expect(markup).toContain("2568/1 รอบ 1");
        expect(markup).not.toContain(FLAG);
    });
});
