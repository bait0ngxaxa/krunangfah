import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsData, SystemAnalyticsOverview } from "@/lib/actions/analytics/types";

const mocks = vi.hoisted(() => ({
    getViewerContext: vi.fn(),
    readAnalytics: vi.fn(),
    readOverview: vi.fn(),
}));

vi.mock("@/lib/auth/viewer-context", () => ({
    getViewerContext: mocks.getViewerContext,
}));
vi.mock("@/lib/database/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/actions/analytics/redis-cache", () => ({
    createAnalyticsRedisKeyParts: () => ["analytics-test"],
    createSystemOverviewRedisKeyParts: () => ["overview-test"],
    readRedisCachedAnalyticsData: mocks.readAnalytics,
    readRedisCachedSystemOverview: mocks.readOverview,
    setRedisCachedAnalyticsData: vi.fn(),
    setRedisCachedSystemOverview: vi.fn(),
}));
vi.mock("@/lib/utils/logging", () => ({ logError: vi.fn() }));

const { getAnalyticsSummary, getSystemAnalyticsOverview } =
    await import("@/lib/actions/analytics/main");

const analyticsData: AnalyticsData = {
    totalStudents: 0,
    studentsWithAssessment: 0,
    studentsWithoutAssessment: 0,
    screeningCoveragePercent: 0,
    selectedAcademicTermExists: false,
    riskLevelSummary: [],
    availableClasses: [],
    availableAcademicTerms: [],
    availableRounds: [],
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
};

const overviewData: SystemAnalyticsOverview = {
    totalSchools: 0,
    totalStudents: 0,
    studentsWithAssessment: 0,
    screeningCoveragePercent: 0,
    academicYearLabel: "ยังไม่มีข้อมูลปีการศึกษา",
    availableAcademicTerms: [],
};

describe("analytics query results", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.readAnalytics.mockResolvedValue({
            data: analyticsData,
            versionedKeyParts: [],
        });
        mocks.readOverview.mockResolvedValue({
            data: overviewData,
            versionedKeyParts: [],
        });
    });

    it("returns success when analytics data is available", async () => {
        mocks.getViewerContext.mockResolvedValue({
            role: "school_admin",
            schoolId: "school-1",
        });

        await expect(getAnalyticsSummary()).resolves.toEqual({
            status: "success",
            data: analyticsData,
        });
    });

    it("returns not_found when the viewer has no school", async () => {
        mocks.getViewerContext.mockResolvedValue({ role: "school_admin" });

        await expect(getAnalyticsSummary()).resolves.toEqual({
            status: "not_found",
        });
    });

    it("returns not_found when a class teacher has no advisory class", async () => {
        mocks.getViewerContext.mockResolvedValue({
            role: "class_teacher",
            schoolId: "school-1",
        });

        await expect(getAnalyticsSummary()).resolves.toEqual({
            status: "not_found",
        });
    });

    it("returns forbidden for a non-system viewer requesting system overview", async () => {
        mocks.getViewerContext.mockResolvedValue({
            role: "school_admin",
            schoolId: "school-1",
        });

        await expect(getSystemAnalyticsOverview()).resolves.toEqual({
            status: "forbidden",
        });
    });

    it("returns transient_error when viewer or query resolution fails", async () => {
        mocks.getViewerContext.mockRejectedValue(new Error("database unavailable"));

        await expect(getAnalyticsSummary()).resolves.toEqual({
            status: "transient_error",
            requestId: expect.any(String),
        });
    });

    it("returns transient_error when the analytics cache fails", async () => {
        mocks.getViewerContext.mockResolvedValue({
            role: "school_admin",
            schoolId: "school-1",
        });
        mocks.readAnalytics.mockRejectedValue(new Error("cache unavailable"));

        await expect(getAnalyticsSummary()).resolves.toEqual({
            status: "transient_error",
            requestId: expect.any(String),
        });
    });
});
