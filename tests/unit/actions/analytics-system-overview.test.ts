import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    schoolCount: vi.fn(),
    academicYearFindMany: vi.fn(),
    academicYearFindUnique: vi.fn(),
    queryRaw: vi.fn(),
    getExpectedStudentCount: vi.fn(),
    lifecycle: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        school: { count: mocks.schoolCount },
        academicYear: {
            findMany: mocks.academicYearFindMany,
            findUnique: mocks.academicYearFindUnique,
        },
        $queryRaw: mocks.queryRaw,
    },
}));
vi.mock("@/lib/actions/analytics/data", () => ({
    getExpectedStudentCount: mocks.getExpectedStudentCount,
}));
vi.mock("@/lib/services/academic-year-lifecycle", () => ({
    ensureCurrentAcademicYearLifecycle: mocks.lifecycle,
}));

const { fetchSystemAnalyticsOverview } = await import(
    "@/lib/actions/analytics/system-overview"
);

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
        mocks.getExpectedStudentCount.mockResolvedValue(100);
        mocks.queryRaw.mockResolvedValue([{ count: BigInt(40) }]);
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
            academicYearLabel: "ปีการศึกษา 2569 เทอม 1",
        });
    });
});
