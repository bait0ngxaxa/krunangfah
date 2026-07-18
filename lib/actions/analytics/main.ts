"use server";

import { prisma } from "@/lib/database/prisma";
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
    calculateScreeningCoveragePercent,
} from "./transforms";
import {
    ANALYTICS_OVERVIEW_TAG,
    getAnalyticsCacheTags,
} from "./cache";
import {
    createAnalyticsRedisKeyParts,
    createSystemOverviewRedisKeyParts,
    readRedisCachedAnalyticsData,
    readRedisCachedSystemOverview,
    setRedisCachedAnalyticsData,
    setRedisCachedSystemOverview,
} from "./redis-cache";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/actions/school-setup.actions";
import { getCurrentAcademicYearRecord } from "@/lib/actions/academic-year.actions";
import { ensureCurrentAcademicYearLifecycle } from "@/lib/services/academic-year-lifecycle";

import type { AcademicTermOption, AnalyticsData, SystemAnalyticsOverview } from "./types";
import { handleQueryError } from "@/lib/actions/error-handler";
import {
    querySuccess,
    type QueryResult,
} from "@/lib/actions/query-result";

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

export async function fetchAnalyticsData(
    schoolId: string | undefined,
    targetClass: string,
    role: string,
    academicYearStr: string,
    semesterStr: string,
    roundStr: string,
): Promise<AnalyticsData> {
    const classFilter = targetClass || undefined;
    let academicYear = academicYearStr ? parseInt(academicYearStr, 10) : undefined;
    let semester = semesterStr ? parseInt(semesterStr, 10) : undefined;
    const assessmentRound = roundStr ? parseInt(roundStr, 10) : undefined;

    if (academicYear === undefined && semester === undefined) {
        const currentTerm = await ensureCurrentAcademicYearLifecycle();
        academicYear = currentTerm.year;
        semester = currentTerm.semester;
    }

    const showClassFilter = role === "school_admin" || role === "system_admin";
    const selectedAcademicYears = academicYear !== undefined
        ? await prisma.academicYear.findMany({
              where: {
                  year: academicYear,
                  ...(semester !== undefined ? { semester } : {}),
              },
              select: { id: true, isCurrent: true },
          })
        : undefined;
    const academicYearIds = selectedAcademicYears?.map((term) => term.id);
    const selectedAcademicTermExists = (academicYearIds?.length ?? 0) > 0;

    const selectedCurrentTerm = selectedAcademicYears?.find(
        (term) => term.isCurrent,
    );
    if (schoolId && selectedCurrentTerm) {
        await ensureSchoolClassTermsForAcademicYear(
            schoolId,
            selectedCurrentTerm.id,
        );
    }

    const [
        expectedStudentCount,
        availableClasses,
        availableAcademicTermsRaw,
        combinedData,
        trendDataRaw,
        activityProgressRaw,
        activityCompletionRaw,
    ] = await Promise.all([
        getExpectedStudentCount(schoolId, classFilter, academicYearIds),
        showClassFilter
            ? prisma.schoolClass
                  .findMany({
                      where: {
                          ...(schoolId ? { schoolId } : {}),
                          school: { disabledAt: null, isTestData: false },
                      },
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
                            disabledAt: null,
                            isTestData: false,
                            school: { disabledAt: null, isTestData: false },
                        },
                    },
                },
            },
            select: {
                id: true,
                year: true,
                semester: true,
            },
            distinct: ["year", "semester"],
            orderBy: [{ year: "desc" }, { semester: "asc" }],
        }),
        getCombinedAnalytics(schoolId, classFilter, academicYearIds, assessmentRound),
        getTrendData(schoolId, classFilter, academicYearIds, assessmentRound),
        getActivityProgressByRisk(schoolId, classFilter, academicYearIds, assessmentRound),
        getActivityCompletionSummary(
            schoolId,
            classFilter,
            academicYearIds,
            assessmentRound,
        ),
    ]);

    const availableAcademicTerms = availableAcademicTermsRaw.map((term) => ({
        id: term.id,
        year: term.year,
        semester: term.semester,
    }));

    // Query distinct assessment rounds available for current filter scope
    const shouldFilterAcademicTerm =
        academicYear !== undefined || semester !== undefined;
    const availableRoundsRaw = await prisma.phqResult.findMany({
        where: {
            student: {
                ...(schoolId ? { schoolId } : {}),
                ...(classFilter ? { class: classFilter } : {}),
                disabledAt: null,
                isTestData: false,
                school: { disabledAt: null, isTestData: false },
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
    const studentsWithoutAssessment = expectedStudentCount === null
        ? null
        : Math.max(0, expectedStudentCount - studentsWithAssessment);
    const screeningCoveragePercent = calculateScreeningCoveragePercent(
        studentsWithAssessment,
        expectedStudentCount,
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
        screeningCoveragePercent,
        selectedAcademicTermExists,
        availableClasses,
        availableAcademicTerms,
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

export async function getExpectedStudentCount(
    schoolId: string | undefined,
    classFilter?: string,
    academicYearIds?: readonly string[],
): Promise<number | null> {
    if (!academicYearIds || academicYearIds.length !== 1) return null;

    const result = await prisma.schoolClassTerm.aggregate({
        where: {
            academicYearId: academicYearIds[0],
            schoolClass: {
                ...(schoolId ? { schoolId } : {}),
                ...(classFilter ? { name: classFilter } : {}),
                school: { disabledAt: null, isTestData: false },
            },
        },
        _sum: { expectedStudentCount: true },
    });

    return result._sum.expectedStudentCount;
}

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
    const redisCached = await readRedisCachedAnalyticsData(cacheKey, schoolId);
    if (redisCached.data) {
        return redisCached.data;
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
    await setRedisCachedAnalyticsData(
        cacheKey,
        data,
        schoolId,
        redisCached.versionedKeyParts,
    );
    return data;
}

export async function getAnalyticsSummary(
    classFilter?: string,
    schoolFilter?: string,
    academicYear?: number,
    semester?: number,
    assessmentRound?: number,
): Promise<QueryResult<AnalyticsData>> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && viewer.role !== "system_admin") {
            return { status: "not_found" };
        }

        if (viewer.role === "system_admin" && !schoolFilter) {
            return { status: "not_found" };
        }

        let targetClass: string | undefined;
        if (viewer.role === "class_teacher") {
            targetClass = viewer.advisoryClass;
            if (!targetClass) {
                return { status: "not_found" };
            }
        } else {
            targetClass = classFilter;
        }

        const schoolId =
            viewer.role === "system_admin"
                ? schoolFilter
                : viewer.schoolId;

        return querySuccess(
            await getCachedAnalyticsData(
                schoolId,
                targetClass ?? "",
                viewer.role,
                academicYear?.toString() ?? "",
                semester?.toString() ?? "",
                assessmentRound?.toString() ?? "",
            ),
        );
    } catch (error) {
        return handleQueryError("Get analytics summary error:", error);
    }
}

async function fetchSystemAnalyticsOverview(
    academicYear?: number,
    semester?: number,
): Promise<SystemAnalyticsOverview> {
    const [totalSchools, currentAcademicYear, overviewOptions] = await Promise.all([
        prisma.school.count({ where: { disabledAt: null, isTestData: false } }),
        getCurrentAcademicYearRecord(),
        getOverviewAcademicTermOptions(),
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
        where: { disabledAt: null, isTestData: false },
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
        [resolvedAcademicYear.id],
    );
    const resolvedTotalStudents = totalStudents ?? 0;

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

export async function getSystemAnalyticsOverview(
    academicYear?: number,
    semester?: number,
): Promise<QueryResult<SystemAnalyticsOverview>> {
    try {
        const viewer = await getViewerContext();
        if (viewer.role !== "system_admin") {
            return { status: "forbidden" };
        }

        const overviewCacheKey = createSystemOverviewRedisKeyParts({
            academicYear,
            semester,
        });
        const redisCached = await readRedisCachedSystemOverview(overviewCacheKey);
        if (redisCached.data) {
            return querySuccess(redisCached.data);
        }

        const cachedOverviewFetcher = unstable_cache(
            async () => fetchSystemAnalyticsOverview(academicYear, semester),
            overviewCacheKey,
            { revalidate: 300, tags: [ANALYTICS_OVERVIEW_TAG] },
        );

        const data = await cachedOverviewFetcher();
        await setRedisCachedSystemOverview(
            overviewCacheKey,
            data,
            redisCached.versionedKeyParts,
        );
        return querySuccess(data);
    } catch (error) {
        return handleQueryError("Get system analytics overview error:", error);
    }
}
