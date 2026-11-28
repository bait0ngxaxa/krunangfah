import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnalyticsSummaryCards } from "@/components/analytics/AnalyticsSummaryCards";
import { buildAnalyticsTabs } from "@/components/analytics/AnalyticsTabContent";
import type { AnalyticsData } from "@/lib/actions/analytics/types";

const activityCompletionSummary = {
    notStartedStudents: 1,
    inProgressStudents: 2,
    completedStudents: 1,
    requiringActivityStudents: 4,
    notRequiringActivityStudents: 2,
};

const baseData: AnalyticsData = {
    totalStudents: 10,
    riskLevelSummary: [],
    studentsWithAssessment: 8,
    studentsWithoutAssessment: 2,
    screeningCoveragePercent: 80,
    coverageCountMismatches: [],
    coverageUncountedStudents: 0,
    selectedAcademicTermExists: true,
    availableClasses: ["ม.1/1"],
    availableAcademicTerms: [
        { id: "term-1", year: 2569, semester: 1 },
    ],
    selectableAcademicTerms: [{ id: "term-1", year: 2569, semester: 1 }],
    availableRounds: [1, 2],
    currentClass: "ม.1/1",
    currentAcademicYear: 2569,
    currentSemester: 1,
    currentRound: 1,
    trendData: [],
    activityAnalyticsApplicable: true,
    activityAnalyticsRound: 1,
    activityProgressByRisk: [
        {
            riskLevel: "yellow",
            label: "เสี่ยงปานกลาง",
            color: "#F59E0B",
            totalStudents: 4,
            noActivity: 1,
            activity1: 3,
            activity2: 2,
            activity3: 1,
            activity4: 0,
            activity5: 1,
        },
    ],
    activityCompletionSummary,
    gradeRiskData: [],
    hospitalReferralsByGrade: [],
    totalReferrals: 0,
    legacyClassAttribution: false,
};

function createData(overrides: Partial<AnalyticsData> = {}): AnalyticsData {
    return { ...baseData, ...overrides };
}

function renderSummary(data: AnalyticsData): string {
    return renderToStaticMarkup(
        <AnalyticsSummaryCards
            totalStudents={data.totalStudents}
            studentsWithAssessment={data.studentsWithAssessment}
            screeningCoveragePercent={data.screeningCoveragePercent}
            activityAnalyticsApplicable={data.activityAnalyticsApplicable}
            activityAnalyticsRound={data.activityAnalyticsRound}
            activityCompletionSummary={data.activityCompletionSummary}
            currentRound={data.currentRound}
            currentClass={data.currentClass}
            coverageCountMismatches={data.coverageCountMismatches}
            coverageUncountedStudents={data.coverageUncountedStudents}
            isSingleTerm={true}
            canEditPlannedCounts={false}
        />,
    );
}

function buildTabs(data: AnalyticsData) {
    return buildAnalyticsTabs({
        data,
        pieChartData: [],
        pieChartTitle: "ข้อมูลนักเรียน",
        showAdminTables: false,
        userRole: "school_admin",
        selectedClass: "ม.1/1",
    });
}

describe("Analytics round-scoped activity presentation", () => {
    it("keeps activity summary metrics for Round 1", () => {
        const html = renderSummary(baseData);

        expect(html).toContain("ต้องทำกิจกรรม");
        expect(html).toContain("ไม่ต้องทำกิจกรรม");
        expect(html).toContain("ผลกิจกรรม");
        expect(html).toContain("ยังไม่เริ่มทำกิจกรรม");
    });

    it("removes activity metrics and shows the terminal Round 2 state", () => {
        const html = renderSummary(
            createData({
                currentRound: 2,
                activityAnalyticsApplicable: false,
                activityAnalyticsRound: null,
                activityProgressByRisk: null,
                activityCompletionSummary: null,
            }),
        );

        expect(html).toContain("คัดกรองแล้ว");
        expect(html).toContain("ผลคัดกรองครั้งที่ 2 เป็นการประเมินปลายเทอม");
        expect(html).toContain("ไม่มีชุดกิจกรรมต่อจากผลคัดกรองนี้");
        expect(html).not.toContain("ต้องทำกิจกรรม");
        expect(html).not.toContain("ไม่ต้องทำกิจกรรม");
        expect(html).not.toContain("ผลกิจกรรม");
        expect(html).not.toContain("ยังไม่เริ่มทำกิจกรรม");
        expect(html).not.toContain("เริ่มแล้วแต่ยังไม่เสร็จครบ");
        expect(html).not.toContain("ทำกิจกรรมเสร็จครบแล้ว");
    });

    it("labels ALL activity metrics as Round 1 and uses the dedicated population", () => {
        const html = renderSummary(createData({ currentRound: undefined }));

        expect(html).toContain("การแบ่งกลุ่มกิจกรรมอ้างอิงผลคัดกรองครั้งที่ 1");
        expect(html).toContain("ผลกิจกรรมจากการคัดกรองครั้งที่ 1");
        expect(html).toContain("4 คน");
        expect(html).toContain("2 คน");
    });

    it("shows the activity tab and table for Round 1", () => {
        const tabs = buildTabs(baseData);

        expect(tabs.map((tab) => tab.id)).toEqual([
            "summary",
            "trend",
            "progress",
        ]);
        const activityLabel = renderToStaticMarkup(
            <>{tabs[2]?.label}</>,
        );
        const activityHtml = renderToStaticMarkup(
            <>{tabs[2]?.content}</>,
        );
        expect(activityLabel).toContain("การทำกิจกรรม");
        expect(activityHtml).toContain("กระบวนการช่วยเหลือ (ห้อง ม.1/1)");
        expect(activityHtml).toContain("ฉันชอบตัวเอง");
    });

    it("hides the activity tab and table for Round 2", () => {
        const tabs = buildTabs(
            createData({
                currentRound: 2,
                activityAnalyticsApplicable: false,
                activityAnalyticsRound: null,
                activityProgressByRisk: null,
                activityCompletionSummary: null,
            }),
        );

        expect(tabs.map((tab) => tab.id)).toEqual(["summary", "trend"]);
        expect(tabs.some((tab) => tab.id === "progress")).toBe(false);
    });

    it("labels ALL activity tab and table with Round 1 ownership", () => {
        const tabs = buildTabs(createData({ currentRound: undefined }));

        expect(tabs.map((tab) => tab.id)).toEqual([
            "summary",
            "trend",
            "progress",
        ]);
        const activityLabel = renderToStaticMarkup(
            <>{tabs[2]?.label}</>,
        );
        const activityHtml = renderToStaticMarkup(
            <>{tabs[2]?.content}</>,
        );
        expect(activityLabel).toContain("การทำกิจกรรม (ครั้งที่ 1)");
        expect(activityHtml).toContain(
            "กระบวนการช่วยเหลือ (ผลคัดกรองครั้งที่ 1 · ห้อง ม.1/1)",
        );
    });
});
