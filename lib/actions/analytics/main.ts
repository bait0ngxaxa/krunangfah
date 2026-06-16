"use server";

import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getViewerContext } from "@/lib/auth/viewer-context";
import {
    getCombinedAnalytics,
    getTrendData,
    getActivityProgressByRisk,
    getActivityCompletionSummary,
} from "./queries";
import {
    transformRiskLevelCounts,
    transformTrendData,
    transformGradeRiskData,
    transformActivityProgress,
    transformHospitalReferrals,
} from "./transforms";
import {
    ANALYTICS_OVERVIEW_TAG,
    getAnalyticsCacheTags,
} from "./cache";
import {
    createAnalyticsRedisKeyParts,
    createSystemOverviewRedisKeyParts,
    getRedisCachedAnalyticsData,
    getRedisCachedSystemOverview,
    setRedisCachedAnalyticsData,
    setRedisCachedSystemOverview,
} from "./redis-cache";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/actions/school-setup.actions";
import { getCurrentAcademicYearRecord } from "@/lib/actions/academic-year.actions";

import type { AnalyticsData, SystemAnalyticsOverview } from "./types";
import { handleActionError } from "@/lib/actions/error-handler";

function buildAnalyticsCacheKey(input: {
    role: string;
    schoolId?: string;
    targetClass: string;
    academicYearStr: string;
    semesterStr: string;
    roundStr: string;
}): string[] {
    return createAnalyticsRedisKeyParts(input);
}

async function fetchAnalyticsData(
    schoolId: string | undefined,
    targetClass: string,
    role: string,
    academicYearStr: string,
    semesterStr: string,
    roundStr: string,
): Promise<AnalyticsData> {
    const classFilter = targetClass || undefined;
    let academicYear = academicYearStr ? parseInt(academicYearStr, 10) : undefined;
    const semester = semesterStr ? parseInt(semesterStr, 10) : undefined;
    const assessmentRound = roundStr ? parseInt(roundStr, 10) : undefined;

    if (!schoolId && !academicYear && !semester) {
        const latestYear = await prisma.academicYear.findFirst({
            orderBy: { year: "desc" },
            select: { year: true },
        });
        if (latestYear) {
            academicYear = latestYear.year;
        }
    }

    const showClassFilter = role === "school_admin" || role === "system_admin";

    const [
        expectedStudentCount,
        availableClasses,
        availableAcademicTermsRaw,
        combinedData,
        trendDataRaw,
        activityProgressRaw,
        activityCompletionRaw,
    ] = await Promise.all([
        getExpectedStudentCount(schoolId, classFilter, academicYear, semester),
        showClassFilter
            ? prisma.schoolClass
                  .findMany({
                      where: { ...(schoolId ? { schoolId } : {}) },
                      select: { name: true },
                      orderBy: { name: "asc" },
                  })
                  .then((classes) => classes.map((c) => c.name))
            : Promise.resolve([]),
        prisma.academicYear.findMany({
            where: {
                phqResults: {
                    some: {
                        student: {
                            ...(schoolId ? { schoolId } : {}),
                            ...(classFilter ? { class: classFilter } : {}),
                        },
                    },
                },
            },
            select: {
                year: true,
                semester: true,
            },
            distinct: ["year", "semester"],
            orderBy: [{ year: "desc" }, { semester: "asc" }],
        }),
        getCombinedAnalytics(schoolId, classFilter, academicYear, semester, assessmentRound),
        getTrendData(schoolId, classFilter, academicYear, semester, assessmentRound),
        getActivityProgressByRisk(schoolId, classFilter, academicYear, semester, assessmentRound),
        getActivityCompletionSummary(
            schoolId,
            classFilter,
            academicYear,
            semester,
            assessmentRound,
        ),
    ]);

    const availableAcademicYears = Array.from(
        new Set(availableAcademicTermsRaw.map((term) => term.year)),
    );
    const availableSemesters = Array.from(
        new Set(availableAcademicTermsRaw.map((term) => term.semester)),
    ).sort((a, b) => a - b);

    // Query distinct assessment rounds available for current filter scope
    const shouldFilterAcademicTerm =
        academicYear !== undefined || semester !== undefined;
    const availableRoundsRaw = await prisma.phqResult.findMany({
        where: {
            student: {
                ...(schoolId ? { schoolId } : {}),
                ...(classFilter ? { class: classFilter } : {}),
            },
            ...(shouldFilterAcademicTerm
                ? {
                      academicYear: {
                          ...(academicYear !== undefined
                              ? { year: academicYear }
                              : {}),
                          ...(semester !== undefined ? { semester } : {}),
                      },
                  }
                : {}),
        },
        select: { assessmentRound: true },
        distinct: ["assessmentRound"],
        orderBy: { assessmentRound: "asc" },
    });
    const availableRounds = availableRoundsRaw.map((r) => r.assessmentRound);

    const {
        riskLevelCounts: riskLevelCountsRaw,
        gradeRiskData: gradeRiskDataRaw,
        hospitalReferrals: hospitalReferralsRaw,
    } = combinedData;

    const studentsWithAssessment = riskLevelCountsRaw.reduce(
        (sum, r) => sum + Number(r.count),
        0,
    );
    const studentsWithoutAssessment = Math.max(
        0,
        expectedStudentCount - studentsWithAssessment,
    );
    const totalReferrals = riskLevelCountsRaw.reduce(
        (sum, r) => sum + Number(r.referral_count),
        0,
    );

    const riskLevelSummary = transformRiskLevelCounts(
        riskLevelCountsRaw,
        studentsWithAssessment,
    );
    const trendData = transformTrendData(trendDataRaw);
    const gradeRiskData = transformGradeRiskData(gradeRiskDataRaw);
    const activityProgressByRisk = transformActivityProgress(activityProgressRaw);
    const activityCompletionSummary = {
        notStartedStudents: Number(activityCompletionRaw.not_started_students),
        inProgressStudents: Number(activityCompletionRaw.in_progress_students),
        completedStudents: Number(activityCompletionRaw.completed_students),
    };
    const hospitalReferralsByGrade =
        transformHospitalReferrals(hospitalReferralsRaw);

    return {
        totalStudents: expectedStudentCount,
        riskLevelSummary,
        studentsWithAssessment,
        studentsWithoutAssessment,
        availableClasses,
        availableAcademicYears,
        availableSemesters,
        availableRounds,
        currentClass: classFilter,
        currentAcademicYear: academicYear,
        currentSemester: semester,
        currentRound: assessmentRound,
        trendData,
        activityProgressByRisk,
        activityCompletionSummary,
        gradeRiskData,
        hospitalReferralsByGrade,
        totalReferrals,
    };
}

async function getExpectedStudentCount(
    schoolId: string | undefined,
    classFilter?: string,
    academicYear?: number,
    semester?: number,
): Promise<number> {
    const academicYearRecord = academicYear
        ? await prisma.academicYear.findFirst({
              where: {
                  year: academicYear,
                  ...(semester !== undefined ? { semester } : {}),
              },
              orderBy: [{ semester: "desc" }],
              select: { id: true },
          })
        : await prisma.academicYear.findFirst({
              where: { isCurrent: true },
              orderBy: [{ year: "desc" }, { semester: "desc" }],
              select: { id: true },
          });

    if (academicYearRecord) {
        const termResult = await prisma.schoolClassTerm.aggregate({
            where: {
                academicYearId: academicYearRecord.id,
                schoolClass: {
                    ...(schoolId ? { schoolId } : {}),
                    ...(classFilter ? { name: classFilter } : {}),
                },
            },
            _sum: { expectedStudentCount: true },
        });

        if (termResult._sum.expectedStudentCount !== null) {
            return termResult._sum.expectedStudentCount;
        }
    }

    const result = await prisma.schoolClass.aggregate({
        where: {
            ...(schoolId ? { schoolId } : {}),
            ...(classFilter ? { name: classFilter } : {}),
        },
        _sum: { expectedStudentCount: true },
    });

    return result._sum.expectedStudentCount ?? 0;
}

async function getOverviewAcademicYearOptions(): Promise<{
    availableAcademicYears: number[];
    availableSemesters: number[];
}> {
    const terms = await prisma.academicYear.findMany({
        select: { year: true, semester: true },
        distinct: ["year", "semester"],
        orderBy: [{ year: "desc" }, { semester: "asc" }],
    });

    return {
        availableAcademicYears: Array.from(
            new Set(terms.map((term) => term.year)),
        ),
        availableSemesters: Array.from(
            new Set(terms.map((term) => term.semester)),
        ).sort((left, right) => left - right),
    };
}

async function getCachedAnalyticsData(
    schoolId: string | undefined,
    targetClass: string,
    role: string,
    academicYearStr: string,
    semesterStr: string,
    roundStr: string,
): Promise<AnalyticsData> {
    const cacheKey = buildAnalyticsCacheKey({
        role,
        schoolId,
        targetClass,
        academicYearStr,
        semesterStr,
        roundStr,
    });
    const redisCached = await getRedisCachedAnalyticsData(cacheKey);
    if (redisCached) {
        return redisCached;
    }

    const cachedFetcher = unstable_cache(
        async () =>
            fetchAnalyticsData(
                schoolId,
                targetClass,
                role,
                academicYearStr,
                semesterStr,
                roundStr,
            ),
        cacheKey,
        { revalidate: 300, tags: getAnalyticsCacheTags(schoolId) },
    );

    const data = await cachedFetcher();
    await setRedisCachedAnalyticsData(cacheKey, data, schoolId);
    return data;
}

export async function getAnalyticsSummary(
    classFilter?: string,
    schoolFilter?: string,
    academicYear?: number,
    semester?: number,
    assessmentRound?: number,
): Promise<AnalyticsData | null> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && viewer.role !== "system_admin") {
            return null;
        }

        if (viewer.role === "system_admin" && !schoolFilter) {
            return null;
        }

        let targetClass: string | undefined;
        if (viewer.role === "class_teacher") {
            targetClass = viewer.advisoryClass;
            if (!targetClass) {
                return null;
            }
        } else {
            targetClass = classFilter;
        }

        const schoolId =
            viewer.role === "system_admin"
                ? schoolFilter
                : viewer.schoolId;

        return getCachedAnalyticsData(
            schoolId,
            targetClass ?? "",
            viewer.role,
            academicYear?.toString() ?? "",
            semester?.toString() ?? "",
            assessmentRound?.toString() ?? "",
        );
    } catch (error) {
        return handleActionError({
            context: "Get analytics summary error:",
            error,
            fallback: null,
        });
    }
}

async function fetchSystemAnalyticsOverview(
    academicYear?: number,
    semester?: number,
): Promise<SystemAnalyticsOverview> {
    const [totalSchools, currentAcademicYear, overviewOptions] = await Promise.all([
        prisma.school.count(),
        getCurrentAcademicYearRecord(),
        getOverviewAcademicYearOptions(),
    ]);

    const resolvedAcademicYear =
        academicYear
            ? await prisma.academicYear.findFirst({
                  where: {
                      year: academicYear,
                      ...(semester !== undefined ? { semester } : {}),
                  },
                  orderBy: [{ semester: "desc" }],
                  select: { id: true, year: true, semester: true },
              })
            : currentAcademicYear ??
              (await prisma.academicYear.findFirst({
                  orderBy: [{ year: "desc" }, { semester: "desc" }],
                  select: { id: true, year: true, semester: true },
              }));

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

    const schools = await prisma.school.findMany({
        select: { id: true },
    });
    await Promise.all(
        schools.map((school) =>
            ensureSchoolClassTermsForAcademicYear(
                school.id,
                resolvedAcademicYear.id,
            ),
        ),
    );

    const totalStudents = await getExpectedStudentCount(
        undefined,
        undefined,
        resolvedAcademicYear.year,
        resolvedAcademicYear.semester,
    );

    const assessedStudentsRaw = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT pr."studentId")::bigint as count
        FROM phq_results pr
        WHERE pr."academicYearId" = ${resolvedAcademicYear.id}
    `;
    const studentsWithAssessment = Number(
        assessedStudentsRaw[0]?.count ?? BigInt(0),
    );
    const screeningCoveragePercent =
        totalStudents > 0
            ? Math.min(
                  100,
                  Math.round((studentsWithAssessment / totalStudents) * 100),
              )
            : 0;

    return {
        totalSchools,
        totalStudents,
        studentsWithAssessment,
        screeningCoveragePercent,
        academicYearLabel: `ปีการศึกษา ${resolvedAcademicYear.year} เทอม ${resolvedAcademicYear.semester}`,
        availableAcademicYears: overviewOptions.availableAcademicYears,
        availableSemesters: overviewOptions.availableSemesters,
        currentAcademicYear: resolvedAcademicYear.year,
        currentSemester: resolvedAcademicYear.semester,
    };
}

export async function getSystemAnalyticsOverview(
    academicYear?: number,
    semester?: number,
): Promise<SystemAnalyticsOverview | null> {
    try {
        const viewer = await getViewerContext();
        if (viewer.role !== "system_admin") {
            return null;
        }

        const overviewCacheKey = createSystemOverviewRedisKeyParts({
            academicYear,
            semester,
        });
        const redisCached = await getRedisCachedSystemOverview(overviewCacheKey);
        if (redisCached) {
            return redisCached;
        }

        const cachedOverviewFetcher = unstable_cache(
            async () => fetchSystemAnalyticsOverview(academicYear, semester),
            overviewCacheKey,
            { revalidate: 300, tags: [ANALYTICS_OVERVIEW_TAG] },
        );

        const data = await cachedOverviewFetcher();
        await setRedisCachedSystemOverview(overviewCacheKey, data);
        return data;
    } catch (error) {
        return handleActionError({
            context: "Get system analytics overview error:",
            error,
            fallback: null,
        });
    }
}
