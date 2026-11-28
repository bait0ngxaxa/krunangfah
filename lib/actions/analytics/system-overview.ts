import { prisma } from "@/lib/database/prisma";
import { calculateScreeningCoverage, mergeClassCoverageCounts } from "./coverage";
import { getExpectedClassCounts } from "./expected-counts";
import { getCombinedAnalytics } from "./queries";
import type { AcademicTermOption, SystemAnalyticsOverview } from "./types";

// Not a "use server" module: the fetcher is an internal cache filler, never a
// client-callable Server Action.

async function getOverviewAcademicTermOptions(): Promise<{
    availableAcademicTerms: AcademicTermOption[];
}> {
    const terms = await prisma.academicYear.findMany({
        select: { id: true, year: true, semester: true },
        distinct: ["year", "semester"],
        orderBy: [{ year: "desc" }, { semester: "asc" }],
    });

    return {
        availableAcademicTerms: terms.map((term) => ({
            id: term.id,
            year: term.year,
            semester: term.semester,
        })),
    };
}

export async function fetchSystemAnalyticsOverview(
    academicYear?: number,
    semester?: number,
): Promise<SystemAnalyticsOverview> {
    // Runs inside unstable_cache, which must not run the lifecycle (it may
    // invalidate caches). The caller resolves the current term first.
    if (academicYear === undefined || semester === undefined) {
        throw new Error(
            "fetchSystemAnalyticsOverview requires an explicit academic year and semester",
        );
    }

    const [totalSchools, overviewOptions] = await Promise.all([
        prisma.school.count({ where: { disabledAt: null, isTestData: false } }),
        getOverviewAcademicTermOptions(),
    ]);

    const resolvedAcademicYear = await prisma.academicYear.findUnique({
        where: { year_semester: { year: academicYear, semester } },
        select: { id: true, year: true, semester: true, isCurrent: true },
    });

    if (!resolvedAcademicYear) {
        return {
            totalSchools,
            totalStudents: 0,
            studentsWithAssessment: 0,
            screeningCoveragePercent: null,
            schoolsWithCountMismatch: 0,
            academicYearLabel: "ยังไม่มีข้อมูลปีการศึกษา",
            ...overviewOptions,
        };
    }

    // Same per-class rule as a school view, over every active school's
    // classes (admin attribution). Summing schools first would let a school
    // with a too-low planned count inflate the national figure.
    const termIds = [resolvedAcademicYear.id];
    const [expectedClassCounts, combined] = await Promise.all([
        getExpectedClassCounts(undefined, undefined, termIds),
        getCombinedAnalytics(
            undefined,
            {},
            termIds,
            undefined,
            resolvedAcademicYear.isCurrent,
        ),
    ]);
    const coverage = calculateScreeningCoverage(
        mergeClassCoverageCounts(expectedClassCounts, combined.assessedByClass),
    );
    const studentsWithAssessment = combined.riskLevelCounts.reduce(
        (sum, row) => sum + Number(row.count),
        0,
    );

    return {
        totalSchools,
        totalStudents: coverage.expectedTotal,
        studentsWithAssessment,
        screeningCoveragePercent: coverage.coveragePercent,
        schoolsWithCountMismatch: coverage.schoolsWithMismatch,
        academicYearLabel: `ปีการศึกษา ${resolvedAcademicYear.year} เทอม ${resolvedAcademicYear.semester}`,
        availableAcademicTerms: overviewOptions.availableAcademicTerms,
        currentAcademicYear: resolvedAcademicYear.year,
        currentSemester: resolvedAcademicYear.semester,
    };
}
