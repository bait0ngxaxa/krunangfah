import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsData } from "@/lib/actions/analytics/types";

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

// 2026-07-01 Bangkok is academic year 2569, semester 1.
const NOW = new Date("2026-07-01T05:00:00.000Z");
const CURRENT_YEAR = 2569;

function analyticsData(year: number): AnalyticsData {
    return {
        totalStudents: 60,
        studentsWithAssessment: 60,
        studentsWithoutAssessment: 5,
        screeningCoveragePercent: 92,
        coverageCountMismatches: [{ className: "ม.1/1", expected: 30, assessed: 35 }],
        coverageUncountedStudents: 5,
        selectedAcademicTermExists: true,
        riskLevelSummary: [],
        availableClasses: ["ม.1/1"],
        availableAcademicTerms: [{ id: `term-${year}-1`, year, semester: 1 }],
        selectableAcademicTerms: [{ id: `term-${year}-1`, year, semester: 1 }],
        availableRounds: [1],
        trendData: [],
        activityAnalyticsApplicable: false,
        activityAnalyticsRound: null,
        activityProgressByRisk: null,
        activityCompletionSummary: null,
        gradeRiskData: [],
        hospitalReferralsByGrade: [],
        totalReferrals: 0,
        legacyClassAttribution: false,
        currentAcademicYear: year,
        currentSemester: 1,
    };
}

async function canEditPlannedCounts(
    user: Record<string, unknown>,
    year: number,
    searchParams: Record<string, string> = {},
): Promise<boolean> {
    mocks.requireAuth.mockResolvedValue({ user });
    mocks.getAnalyticsSummary.mockResolvedValue({
        status: "success",
        data: analyticsData(year),
    });
    const page = await AnalyticsPage({ searchParams: Promise.resolve(searchParams) });
    return page.props.children[1].props.children.props.canEditPlannedCounts;
}

describe("Analytics page planned-count edit link", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(NOW);
        mocks.getSchools.mockResolvedValue({
            status: "success",
            data: [{ id: "school-1", name: "โรงเรียนสังเคราะห์" }],
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("allows the primary school admin in a current-year term", async () => {
        await expect(
            canEditPlannedCounts({ role: "school_admin", isPrimary: true }, CURRENT_YEAR),
        ).resolves.toBe(true);
    });

    it("denies a past-year term even for the primary school admin", async () => {
        await expect(
            canEditPlannedCounts({ role: "school_admin", isPrimary: true }, CURRENT_YEAR - 1),
        ).resolves.toBe(false);
    });

    it.each([
        { name: "a non-primary school admin", user: { role: "school_admin", isPrimary: false } },
        { name: "a class teacher", user: { role: "class_teacher" } },
    ])("denies $name", async ({ user }) => {
        await expect(canEditPlannedCounts(user, CURRENT_YEAR)).resolves.toBe(false);
    });

    it("denies a system admin viewing a school", async () => {
        await expect(
            canEditPlannedCounts({ role: "system_admin" }, CURRENT_YEAR, { school: "school-1" }),
        ).resolves.toBe(false);
    });
});
