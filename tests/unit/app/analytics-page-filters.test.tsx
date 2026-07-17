import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
    AnalyticsData,
    SystemAnalyticsOverview,
} from "@/lib/actions/analytics/types";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

const mocks = vi.hoisted(() => ({
    getAnalyticsSummary: vi.fn(),
    getSchools: vi.fn(),
    getSystemAnalyticsOverview: vi.fn(),
    redirect: vi.fn((path: string): never => {
        throw new Error(`REDIRECT:${path}`);
    }),
    requireAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/actions/dashboard.actions", () => ({
    getSchools: mocks.getSchools,
}));
vi.mock("@/lib/actions/analytics/main", () => ({
    getAnalyticsSummary: mocks.getAnalyticsSummary,
    getSystemAnalyticsOverview: mocks.getSystemAnalyticsOverview,
}));

import AnalyticsPage from "@/app/(protected)/analytics/page";

const analyticsData: AnalyticsData = {
    totalStudents: 20,
    studentsWithAssessment: 10,
    studentsWithoutAssessment: 10,
    screeningCoveragePercent: 50,
    selectedAcademicTermExists: true,
    riskLevelSummary: [],
    availableClasses: ["ม.1/1"],
    availableAcademicYears: [2569],
    availableSemesters: [1],
    availableRounds: [1],
    trendData: [],
    activityProgressByRisk: [],
    activityCompletionSummary: {
        notStartedStudents: 0,
        inProgressStudents: 0,
        completedStudents: 0,
    },
    gradeRiskData: [],
    hospitalReferralsByGrade: [],
    totalReferrals: 0,
    currentAcademicYear: 2569,
    currentSemester: 1,
};

const systemOverview: SystemAnalyticsOverview = {
    totalSchools: 10,
    totalStudents: 100,
    studentsWithAssessment: 80,
    screeningCoveragePercent: 80,
    academicYearLabel: "ปีการศึกษา 2569 เทอม 2",
    availableAcademicYears: [2568, 2569],
    availableSemesters: [1, 2],
    currentAcademicYear: 2569,
    currentSemester: 2,
};

describe("Analytics page filter validation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuth.mockResolvedValue({
            user: { role: "school_admin", isPrimary: true },
        });
        mocks.getAnalyticsSummary.mockResolvedValue({
            status: "success",
            data: analyticsData,
        });
    });

    it("canonicalizes an invalid year before querying instead of broadening to every year", async () => {
        await expect(
            AnalyticsPage({ searchParams: Promise.resolve({ year: "invalid" }) }),
        ).rejects.toThrow("REDIRECT:/analytics");

        expect(mocks.getAnalyticsSummary).not.toHaveBeenCalled();
    });

    it("does not relabel a queried but unavailable year as all years", async () => {
        mocks.getAnalyticsSummary.mockResolvedValue({
            status: "success",
            data: {
                ...analyticsData,
                selectedAcademicTermExists: false,
            },
        });
        const page = await AnalyticsPage({
            searchParams: Promise.resolve({ year: "2600" }),
        });
        const analyticsContent = page.props.children[1].props.children;

        expect(mocks.getAnalyticsSummary).toHaveBeenCalledWith(
            undefined,
            "all",
            2600,
            undefined,
            undefined,
        );
        expect(analyticsContent.props.selectedAcademicYear).toBe("2600");
        expect(analyticsContent.props.filterWarnings).toContain(
            'ไม่พบปีการศึกษา "2600" ในขอบเขตข้อมูล',
        );
    });

    it("canonicalizes semester-only URLs before querying", async () => {
        await expect(
            AnalyticsPage({ searchParams: Promise.resolve({ semester: "1" }) }),
        ).rejects.toThrow("REDIRECT:/analytics");

        expect(mocks.getAnalyticsSummary).not.toHaveBeenCalled();
    });

    it("shows the resolved current term when the URL has no term filter", async () => {
        const page = await AnalyticsPage({
            searchParams: Promise.resolve({}),
        });
        const analyticsContent = page.props.children[1].props.children;

        expect(analyticsContent.props.selectedAcademicYear).toBe("2569");
        expect(analyticsContent.props.selectedSemester).toBe("1");
    });

    it("explains that a valid term has no screening results without calling the filter invalid", async () => {
        mocks.getAnalyticsSummary.mockResolvedValue({
            status: "success",
            data: {
                ...analyticsData,
                availableAcademicYears: [],
                availableSemesters: [],
                selectedAcademicTermExists: true,
            },
        });

        const page = await AnalyticsPage({ searchParams: Promise.resolve({}) });
        const analyticsContent = page.props.children[1].props.children;

        expect(analyticsContent.props.filterWarnings).toEqual([
            "ยังไม่มีผลคัดกรองในปีการศึกษา 2569 เทอม 1",
        ]);
    });

    it("renders a retry state instead of redirecting on a transient query error", async () => {
        mocks.getAnalyticsSummary.mockResolvedValue({
            status: "transient_error",
            requestId: "analytics-request-1",
        });

        const page = await AnalyticsPage({ searchParams: Promise.resolve({}) });

        expect(page.type).toBe(QueryErrorState);
        expect(page.props.requestId).toBe("analytics-request-1");
        expect(mocks.redirect).not.toHaveBeenCalled();
    });

    it("shows the current term resolved by system analytics by default", async () => {
        mocks.requireAuth.mockResolvedValue({
            user: { role: "system_admin" },
        });
        mocks.getSchools.mockResolvedValue([]);
        mocks.getSystemAnalyticsOverview.mockResolvedValue({
            status: "success",
            data: systemOverview,
        });

        const page = await AnalyticsPage({ searchParams: Promise.resolve({}) });
        const analyticsContent = page.props.children[1].props.children;

        expect(analyticsContent.props.selectedAcademicYear).toBe("2569");
        expect(analyticsContent.props.selectedSemester).toBe("2");
    });

    it("shows the latest resolved semester when only a year is selected", async () => {
        mocks.requireAuth.mockResolvedValue({
            user: { role: "system_admin" },
        });
        mocks.getSchools.mockResolvedValue([]);
        mocks.getSystemAnalyticsOverview.mockResolvedValue({
            status: "success",
            data: {
                ...systemOverview,
                currentAcademicYear: 2568,
                currentSemester: 1,
                academicYearLabel: "ปีการศึกษา 2568 เทอม 1",
            },
        });

        const page = await AnalyticsPage({
            searchParams: Promise.resolve({ year: "2568" }),
        });
        const analyticsContent = page.props.children[1].props.children;

        expect(mocks.getSystemAnalyticsOverview).toHaveBeenCalledWith(
            2568,
            undefined,
        );
        expect(analyticsContent.props.selectedAcademicYear).toBe("2568");
        expect(analyticsContent.props.selectedSemester).toBe("1");
    });
});
