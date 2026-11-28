import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    academicYearFindMany: vi.fn(),
    schoolClassFindMany: vi.fn(),
    schoolClassTermFindMany: vi.fn(),
    phqResultFindMany: vi.fn(),
    getCombinedAnalytics: vi.fn(),
    getTrendData: vi.fn(),
    getActivityProgressByRisk: vi.fn(),
    getActivityCompletionSummary: vi.fn(),
    ensureCurrentAcademicYearLifecycle: vi.fn(),
    ensureSchoolClassTermsForAcademicYear: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        academicYear: { findMany: mocks.academicYearFindMany },
        schoolClass: { findMany: mocks.schoolClassFindMany },
        schoolClassTerm: { findMany: mocks.schoolClassTermFindMany },
        phqResult: { findMany: mocks.phqResultFindMany },
        // Past-term class options and the legacy-snapshot check.
        $queryRaw: vi.fn(async () => []),
    },
}));

vi.mock("@/lib/actions/analytics/queries", () => ({
    getCombinedAnalytics: mocks.getCombinedAnalytics,
    getTrendData: mocks.getTrendData,
    getActivityProgressByRisk: mocks.getActivityProgressByRisk,
    getActivityCompletionSummary: mocks.getActivityCompletionSummary,
}));

vi.mock("@/lib/services/academic-year-lifecycle", () => ({
    ensureCurrentAcademicYearLifecycle:
        mocks.ensureCurrentAcademicYearLifecycle,
}));
vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear:
        mocks.ensureSchoolClassTermsForAcademicYear,
}));

const { fetchAnalyticsData } = await import("@/lib/actions/analytics/data");

function termRow(name: string, expected: number) {
    return {
        expectedStudentCount: expected,
        schoolClass: { schoolId: "school-1", name },
    };
}

function mockCombined(assessed: Record<string, number>): void {
    const entries = Object.entries(assessed);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    mocks.getCombinedAnalytics.mockResolvedValue({
        riskLevelCounts: [
            { risk_level: "yellow", count: BigInt(total), referral_count: BigInt(0) },
        ],
        gradeRiskData: [],
        hospitalReferrals: [],
        assessedByClass: entries.map(([className, count]) => ({
            schoolId: "school-1",
            className,
            assessed: count,
        })),
    });
}

function configureMocks(): void {
    mocks.academicYearFindMany.mockResolvedValue([
        { id: "term-1", year: 2569, semester: 1, isCurrent: false },
    ]);
    mocks.schoolClassFindMany.mockResolvedValue([]);
    mocks.schoolClassTermFindMany.mockResolvedValue([
        termRow("ม.1/1", 10),
    ]);
    mocks.phqResultFindMany.mockResolvedValue([
        { assessmentRound: 1 },
        { assessmentRound: 2 },
    ]);
    mocks.getCombinedAnalytics.mockResolvedValue({
        riskLevelCounts: [
            {
                risk_level: "yellow",
                count: BigInt(4),
                referral_count: BigInt(0),
            },
        ],
        gradeRiskData: [],
        hospitalReferrals: [],
        assessedByClass: [
            { schoolId: "school-1", className: "ม.1/1", assessed: 4 },
        ],
    });
    mocks.getTrendData.mockResolvedValue([]);
    mocks.getActivityProgressByRisk.mockResolvedValue([]);
    mocks.getActivityCompletionSummary.mockResolvedValue({
        not_started_students: BigInt(1),
        in_progress_students: BigInt(2),
        completed_students: BigInt(1),
        requiring_activity_students: BigInt(4),
        not_requiring_activity_students: BigInt(2),
    });
}

describe("fetchAnalyticsData activity scope", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        configureMocks();
    });

    it("throws when called without a year or semester instead of defaulting", async () => {
        await expect(
            fetchAnalyticsData("school-1", "", "school_admin", "", "", ""),
        ).rejects.toThrow("requires an explicit academic year or semester");
        expect(mocks.ensureCurrentAcademicYearLifecycle).not.toHaveBeenCalled();
        expect(mocks.getCombinedAnalytics).not.toHaveBeenCalled();
    });

    it("aggregates both semesters for a year-only school view with coverage null", async () => {
        mocks.academicYearFindMany.mockResolvedValueOnce([
            { id: "term-1", year: 2569, semester: 1, isCurrent: false },
            { id: "term-2", year: 2569, semester: 2, isCurrent: true },
        ]);

        const data = await fetchAnalyticsData("school-1", "", "school_admin", "2569", "", "");

        expect(mocks.academicYearFindMany.mock.calls[0][0]).toMatchObject({
            where: { year: 2569 },
        });
        expect(mocks.getCombinedAnalytics).toHaveBeenCalledWith(
            "school-1",
            { classFilter: undefined },
            ["term-1", "term-2"],
            undefined,
            false,
        );
        expect(mocks.schoolClassTermFindMany).not.toHaveBeenCalled();
        expect(data.totalStudents).toBeNull();
        expect(data.screeningCoveragePercent).toBeNull();
        expect(data.studentsWithoutAssessment).toBeNull();
        expect(data.coverageCountMismatches).toEqual([]);
        expect(data.coverageUncountedStudents).toBe(0);
    });

    it("never runs the academic-year lifecycle (it executes inside unstable_cache)", async () => {
        await fetchAnalyticsData("school-1", "", "school_admin", "2569", "1", "1");
        await fetchAnalyticsData("school-1", "", "school_admin", "2569", "", "");

        expect(mocks.ensureCurrentAcademicYearLifecycle).not.toHaveBeenCalled();
    });

    it("keeps Round 2 screening analytics while avoiding activity queries", async () => {
        const data = await fetchAnalyticsData(
            "school-1",
            "",
            "school_admin",
            "2569",
            "1",
            "2",
        );

        expect(mocks.getCombinedAnalytics).toHaveBeenCalledWith(
            "school-1",
            { classFilter: undefined },
            ["term-1"],
            2,
            false,
        );
        expect(mocks.getTrendData).toHaveBeenCalledWith(
            "school-1",
            { classFilter: undefined },
            ["term-1"],
            2,
            false,
        );
        expect(mocks.getActivityProgressByRisk).not.toHaveBeenCalled();
        expect(mocks.getActivityCompletionSummary).not.toHaveBeenCalled();
        expect(data.activityAnalyticsApplicable).toBe(false);
        expect(data.activityAnalyticsRound).toBeNull();
        expect(data.activityProgressByRisk).toBeNull();
        expect(data.activityCompletionSummary).toBeNull();
        expect(data.studentsWithAssessment).toBe(4);
    });

    it.each([
        { name: "Round 1", round: "1", screeningRound: 1 },
        { name: "ALL", round: "", screeningRound: undefined },
    ])(
        "$name activity analytics uses Round 1 ownership",
        async ({ round, screeningRound }) => {
            const data = await fetchAnalyticsData(
                "school-1",
                "",
                "school_admin",
                "2569",
                "1",
                round,
            );

            expect(mocks.getCombinedAnalytics).toHaveBeenCalledWith(
                "school-1",
                { classFilter: undefined },
                ["term-1"],
                screeningRound,
                false,
            );
            expect(mocks.getActivityProgressByRisk).toHaveBeenCalledWith(
                "school-1",
                { classFilter: undefined },
                ["term-1"],
                1,
                false,
            );
            expect(mocks.getActivityCompletionSummary).toHaveBeenCalledWith(
                "school-1",
                { classFilter: undefined },
                ["term-1"],
                1,
                false,
            );
            expect(data.activityAnalyticsApplicable).toBe(true);
            expect(data.activityAnalyticsRound).toBe(1);
            expect(data.activityCompletionSummary).toEqual({
                notStartedStudents: 1,
                inProgressStudents: 2,
                completedStudents: 1,
                requiringActivityStudents: 4,
                notRequiringActivityStudents: 2,
            });
        },
    );
});

describe("fetchAnalyticsData class scope", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        configureMocks();
    });

    it("passes a class teacher's class as visibility scope, never as a report filter", async () => {
        await fetchAnalyticsData("school-1", "ม.2/1", "class_teacher", "2569", "1", "");

        for (const query of [mocks.getCombinedAnalytics, mocks.getTrendData]) {
            expect(query).toHaveBeenCalledWith(
                "school-1",
                { scopeClass: "ม.2/1" },
                ["term-1"],
                undefined,
                false,
            );
        }
        expect(mocks.getActivityProgressByRisk.mock.calls[0]?.[1]).toEqual({ scopeClass: "ม.2/1" });
        expect(mocks.getActivityCompletionSummary.mock.calls[0]?.[1]).toEqual({ scopeClass: "ม.2/1" });
    });

    it.each(["school_admin", "system_admin"])(
        "passes a %s class selection as the report filter",
        async (role) => {
            await fetchAnalyticsData("school-1", "ม.1/1", role, "2569", "1", "");

            expect(mocks.getCombinedAnalytics).toHaveBeenCalledWith(
                "school-1",
                { classFilter: "ม.1/1" },
                ["term-1"],
                undefined,
                false,
            );
        },
    );
});

describe("fetchAnalyticsData coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        configureMocks();
    });

    it("caps each class at its planned count, then sums", async () => {
        mocks.schoolClassTermFindMany.mockResolvedValue([
            termRow("ม.1/1", 30),
            termRow("ม.1/2", 30),
        ]);
        mockCombined({ "ม.1/1": 35, "ม.1/2": 25 });

        const data = await fetchAnalyticsData("school-1", "", "school_admin", "2569", "1", "");

        expect(data).toMatchObject({
            totalStudents: 60,
            studentsWithAssessment: 60,
            screeningCoveragePercent: 92,
            studentsWithoutAssessment: 5,
            coverageCountMismatches: [{ className: "ม.1/1", expected: 30, assessed: 35 }],
            coverageUncountedStudents: 5,
        });
    });

    it("reports no planned total but still lists screened classes for a term without term rows", async () => {
        mocks.schoolClassTermFindMany.mockResolvedValue([]);
        mockCombined({ "ม.1/1": 3 });

        const data = await fetchAnalyticsData("school-1", "", "school_admin", "2569", "1", "");

        expect(data).toMatchObject({
            totalStudents: null,
            studentsWithAssessment: 3,
            screeningCoveragePercent: null,
            studentsWithoutAssessment: null,
            coverageCountMismatches: [{ className: "ม.1/1", expected: 0, assessed: 3 }],
            coverageUncountedStudents: 3,
        });
    });

    it("reads the planned counts of the selected class only", async () => {
        await fetchAnalyticsData("school-1", "ม.1/1", "school_admin", "2569", "1", "");

        expect(mocks.schoolClassTermFindMany.mock.calls[0]?.[0]).toMatchObject({
            where: {
                academicYearId: "term-1",
                schoolClass: { schoolId: "school-1", name: "ม.1/1" },
            },
        });
    });
});
