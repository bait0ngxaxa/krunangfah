import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { buildCurrentStudentPopulationSql } from "@/lib/utils/student-population";
import { getExpectedStudentCount } from "./data";
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
            screeningCoveragePercent: 0,
            academicYearLabel: "ยังไม่มีข้อมูลปีการศึกษา",
            ...overviewOptions,
        };
    }

    const totalStudents = await getExpectedStudentCount(
        undefined,
        undefined,
        [resolvedAcademicYear.id],
    );
    const resolvedTotalStudents = totalStudents ?? 0;
    const lifecycleCondition = resolvedAcademicYear.isCurrent
        ? buildCurrentStudentPopulationSql()
        : Prisma.empty;

    const assessedStudentsRaw = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT pr."studentId")::bigint as count
        FROM phq_results pr
        JOIN students s ON pr."studentId" = s.id
        JOIN schools sch ON s."schoolId" = sch.id
        WHERE pr."academicYearId" = ${resolvedAcademicYear.id}
          AND s."disabledAt" IS NULL
          AND s."isTestData" = false
          AND sch."disabledAt" IS NULL
          AND sch."isTestData" = false
          ${lifecycleCondition}
    `;
    const studentsWithAssessment = Number(
        assessedStudentsRaw[0]?.count ?? BigInt(0),
    );
    const screeningCoveragePercent =
        resolvedTotalStudents > 0
            ? Math.min(
                  100,
                  Math.round((studentsWithAssessment / resolvedTotalStudents) * 100),
              )
            : 0;

    return {
        totalSchools,
        totalStudents: resolvedTotalStudents,
        studentsWithAssessment,
        screeningCoveragePercent,
        academicYearLabel: `ปีการศึกษา ${resolvedAcademicYear.year} เทอม ${resolvedAcademicYear.semester}`,
        availableAcademicTerms: overviewOptions.availableAcademicTerms,
        currentAcademicYear: resolvedAcademicYear.year,
        currentSemester: resolvedAcademicYear.semester,
    };
}
