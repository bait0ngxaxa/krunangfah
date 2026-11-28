import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnalyticsSummaryCards } from "@/components/analytics/AnalyticsSummaryCards";
import { SystemOverviewCards } from "@/components/analytics/SystemOverviewCards";
import type {
    CoverageCountMismatch,
    SystemAnalyticsOverview,
} from "@/lib/actions/analytics/types";

const EDIT_LINK = "แก้ไขจำนวนนักเรียน";
const ASK_ADMIN = "แจ้งผู้ดูแลโรงเรียนเพื่อแก้ไขจำนวนนักเรียน";
const MISSING_PLANNED = "ยังไม่ได้กำหนดจำนวนนักเรียน จึงคำนวณความครอบคลุมไม่ได้";

interface SummaryInput {
    mismatches?: CoverageCountMismatch[];
    uncounted?: number;
    coverage?: number | null;
    assessed?: number;
    isSingleTerm?: boolean;
    canEditPlannedCounts?: boolean;
}

function renderSummary(input: SummaryInput = {}): string {
    return renderToStaticMarkup(
        <AnalyticsSummaryCards
            totalStudents={60}
            studentsWithAssessment={input.assessed ?? 60}
            screeningCoveragePercent={
                input.coverage === undefined ? 92 : input.coverage
            }
            activityAnalyticsApplicable={false}
            activityAnalyticsRound={null}
            activityCompletionSummary={null}
            coverageCountMismatches={input.mismatches ?? []}
            coverageUncountedStudents={input.uncounted ?? 0}
            isSingleTerm={input.isSingleTerm ?? true}
            canEditPlannedCounts={input.canEditPlannedCounts ?? false}
        />,
    );
}

function mismatch(index: number): CoverageCountMismatch {
    return { className: `ม.1/${index}`, expected: 30, assessed: 30 + index };
}

describe("coverage count mismatch notice", () => {
    it("renders the amber line and the listed class", () => {
        const html = renderSummary({
            mismatches: [{ className: "ม.1/1", expected: 30, assessed: 35 }],
            uncounted: 5,
        });

        expect(html).toContain(
            "จำนวนนักเรียนที่ตั้งไว้ของ 1 ห้องน้อยกว่าที่คัดกรองจริง (5 คนไม่ถูกนับในความครอบคลุม)",
        );
        expect(html).toContain("ม.1/1: ตั้งไว้ 30 คน · คัดกรองแล้ว 35 คน");
        expect(html).not.toContain("และอีก");
    });

    it("lists at most five classes and counts the rest", () => {
        const mismatches = Array.from({ length: 7 }, (_, index) => mismatch(index + 1));
        const html = renderSummary({ mismatches, uncounted: 28 });

        expect(html).toContain("จำนวนนักเรียนที่ตั้งไว้ของ 7 ห้องน้อยกว่าที่คัดกรองจริง (28 คนไม่ถูกนับในความครอบคลุม)");
        for (const row of mismatches.slice(0, 5)) {
            expect(html).toContain(`${row.className}: ตั้งไว้`);
        }
        expect(html).not.toContain("ม.1/6: ตั้งไว้");
        expect(html).not.toContain("ม.1/7: ตั้งไว้");
        expect(html).toContain("และอีก 2 ห้อง");
    });

    it("links to class management only when the viewer can edit planned counts", () => {
        const mismatches = [mismatch(1)];
        const editable = renderSummary({ mismatches, uncounted: 1, canEditPlannedCounts: true });
        const readOnly = renderSummary({ mismatches, uncounted: 1, canEditPlannedCounts: false });

        expect(editable).toContain('href="/school/classes"');
        expect(editable).toContain(EDIT_LINK);
        expect(editable).not.toContain(ASK_ADMIN);
        expect(readOnly).not.toContain('href="/school/classes"');
        expect(readOnly).toContain(ASK_ADMIN);
    });

    it("renders nothing without mismatches", () => {
        const html = renderSummary({ canEditPlannedCounts: true });

        expect(html).not.toContain("ห้องน้อยกว่าที่คัดกรองจริง");
        expect(html).not.toContain(EDIT_LINK);
        expect(html).not.toContain(ASK_ADMIN);
    });
});

describe("missing planned count notice", () => {
    it("explains a single term without planned counts but with results", () => {
        const html = renderSummary({ coverage: null, assessed: 4 });

        expect(html).toContain(MISSING_PLANNED);
        expect(html).toContain("คำนวณไม่ได้");
        expect(html).not.toContain('role="progressbar"');
    });

    it("keeps the plain unavailable state for a multi-term view or without results", () => {
        expect(renderSummary({ coverage: null, assessed: 4, isSingleTerm: false })).not.toContain(MISSING_PLANNED);
        expect(renderSummary({ coverage: null, assessed: 0 })).not.toContain(MISSING_PLANNED);
    });
});

describe("system overview count mismatch note", () => {
    const overview: SystemAnalyticsOverview = {
        totalSchools: 3,
        totalStudents: 30,
        studentsWithAssessment: 22,
        screeningCoveragePercent: 67,
        schoolsWithCountMismatch: 1,
        academicYearLabel: "ปีการศึกษา 2569 เทอม 1",
        availableAcademicTerms: [],
    };

    it("renders the muted line when a school has a mismatch", () => {
        const html = renderToStaticMarkup(<SystemOverviewCards overview={overview} />);

        expect(html).toContain(
            "1 โรงเรียนมีจำนวนนักเรียนที่ตั้งไว้น้อยกว่าที่คัดกรองจริง ความครอบคลุมนับไม่เกินจำนวนที่ตั้งไว้ของแต่ละห้อง",
        );
    });

    it("omits the line without mismatches and shows คำนวณไม่ได้ without a denominator", () => {
        const html = renderToStaticMarkup(
            <SystemOverviewCards
                overview={{ ...overview, schoolsWithCountMismatch: 0, screeningCoveragePercent: null }}
            />,
        );

        expect(html).not.toContain("โรงเรียนมีจำนวนนักเรียนที่ตั้งไว้น้อยกว่า");
        expect(html).toContain("คำนวณไม่ได้");
    });
});
