import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    schoolCount: vi.fn(),
    academicYearFindMany: vi.fn(),
    academicYearFindUnique: vi.fn(),
    getExpectedClassCounts: vi.fn(),
    getCombinedAnalytics: vi.fn(),
    lifecycle: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        school: { count: mocks.schoolCount },
        academicYear: {
            findMany: mocks.academicYearFindMany,
            findUnique: mocks.academicYearFindUnique,
        },
    },
}));
vi.mock("@/lib/actions/analytics/expected-counts", () => ({
    getExpectedClassCounts: mocks.getExpectedClassCounts,
}));
vi.mock("@/lib/actions/analytics/queries", () => ({
    getCombinedAnalytics: mocks.getCombinedAnalytics,
}));
vi.mock("@/lib/services/academic-year-lifecycle", () => ({
    ensureCurrentAcademicYearLifecycle: mocks.lifecycle,
}));

const { fetchSystemAnalyticsOverview } = await import(
    "@/lib/actions/analytics/system-overview"
);

function mockAssessed(
    rows: Array<{ schoolId: string; className: string; assessed: number }>,
): void {
    const total = rows.reduce((sum, row) => sum + row.assessed, 0);
    mocks.getCombinedAnalytics.mockResolvedValue({
        riskLevelCounts: [
            { risk_level: "green", count: BigInt(total), referral_count: BigInt(0) },
        ],
        gradeRiskData: [],
        hospitalReferrals: [],
        assessedByClass: rows,
    });
}

describe("fetchSystemAnalyticsOverview", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.schoolCount.mockResolvedValue(3);
        mocks.academicYearFindMany.mockResolvedValue([]);
        mocks.academicYearFindUnique.mockResolvedValue({
            id: "ay-2569-1",
            year: 2569,
            semester: 1,
            isCurrent: false,
        });
        mocks.getExpectedClassCounts.mockResolvedValue([
            { schoolId: "school-a", className: "ม.1/1", expected: 100 },
        ]);
        mockAssessed([{ schoolId: "school-a", className: "ม.1/1", assessed: 40 }]);
    });

    it("throws without a full term instead of defaulting or guessing a semester", async () => {
        await expect(fetchSystemAnalyticsOverview()).rejects.toThrow(
            "requires an explicit academic year and semester",
        );
        await expect(
            fetchSystemAnalyticsOverview(undefined, 2),
        ).rejects.toThrow("requires an explicit academic year and semester");
        // A year alone used to fall back to its latest semester (A1).
        await expect(
            fetchSystemAnalyticsOverview(2569),
        ).rejects.toThrow("requires an explicit academic year and semester");
        expect(mocks.academicYearFindUnique).not.toHaveBeenCalled();
    });

    it("reads the explicit term without running the lifecycle", async () => {
        const overview = await fetchSystemAnalyticsOverview(2569, 1);

        expect(mocks.lifecycle).not.toHaveBeenCalled();
        expect(mocks.academicYearFindUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { year_semester: { year: 2569, semester: 1 } },
            }),
        );
        expect(overview).toMatchObject({
            totalSchools: 3,
            totalStudents: 100,
            studentsWithAssessment: 40,
            screeningCoveragePercent: 40,
            schoolsWithCountMismatch: 0,
            academicYearLabel: "ปีการศึกษา 2569 เทอม 1",
        });
        // All schools, admin attribution, the term's population rule.
        expect(mocks.getCombinedAnalytics).toHaveBeenCalledWith(
            undefined,
            {},
            ["ay-2569-1"],
            undefined,
            false,
        );
    });

    it("caps each class, so an over-counted school cannot hide another school's gap", async () => {
        mocks.getExpectedClassCounts.mockResolvedValue([
            { schoolId: "school-a", className: "ม.1/1", expected: 10 },
            { schoolId: "school-b", className: "ม.1/1", expected: 30 },
        ]);
        mockAssessed([
            { schoolId: "school-a", className: "ม.1/1", assessed: 20 },
            { schoolId: "school-b", className: "ม.1/1", assessed: 15 },
        ]);

        const overview = await fetchSystemAnalyticsOverview(2569, 1);

        // Totals alone would give min(100, 35/40) = 88%.
        expect(overview).toMatchObject({
            totalStudents: 40,
            studentsWithAssessment: 35,
            screeningCoveragePercent: 63,
            schoolsWithCountMismatch: 1,
        });
    });

    it("has no coverage when no school has a planned count", async () => {
        mocks.getExpectedClassCounts.mockResolvedValue([]);

        const overview = await fetchSystemAnalyticsOverview(2569, 1);

        expect(overview).toMatchObject({
            totalStudents: 0,
            studentsWithAssessment: 40,
            screeningCoveragePercent: null,
            schoolsWithCountMismatch: 1,
        });
    });

    it("has no coverage for a term that does not exist", async () => {
        mocks.academicYearFindUnique.mockResolvedValue(null);

        const overview = await fetchSystemAnalyticsOverview(2569, 1);

        expect(overview).toMatchObject({
            totalStudents: 0,
            screeningCoveragePercent: null,
            schoolsWithCountMismatch: 0,
        });
        expect(mocks.getCombinedAnalytics).not.toHaveBeenCalled();
    });
});
