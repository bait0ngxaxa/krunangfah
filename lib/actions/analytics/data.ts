import { prisma } from "@/lib/database/prisma";
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
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/services/school-class-term-service";
import { ensureCurrentAcademicYearLifecycle } from "@/lib/services/academic-year-lifecycle";
import { canGenerateActivitiesForAssessmentRound } from "@/lib/actions/activity/constants";
import { ACTIVITY_ANALYTICS_ROUND } from "./constants";

import type { AnalyticsData } from "./types";

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
    // "all" is a screening scope, not an assessment round. Activity ownership
    // remains Round 1 unless the user explicitly selects terminal Round 2.
    const activityAnalyticsApplicable =
        assessmentRound === undefined ||
        canGenerateActivitiesForAssessmentRound(assessmentRound);
    const activityAnalyticsRound = activityAnalyticsApplicable
        ? ACTIVITY_ANALYTICS_ROUND
        : null;

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
    const currentPopulationOnly =
        selectedAcademicYears?.length === 1 &&
        selectedAcademicYears[0].isCurrent;

    const selectedCurrentTerm = selectedAcademicYears?.find(
        (term) => term.isCurrent,
    );
    if (schoolId && selectedCurrentTerm) {
        await ensureSchoolClassTermsForAcademicYear(
            schoolId,
            selectedCurrentTerm.id,
        );
    }

    const activityDataPromise = activityAnalyticsRound === ACTIVITY_ANALYTICS_ROUND
        ? Promise.all([
              getActivityProgressByRisk(
                  schoolId,
                  classFilter,
                  academicYearIds,
                  activityAnalyticsRound,
                  currentPopulationOnly,
              ),
              getActivityCompletionSummary(
                  schoolId,
                  classFilter,
                  academicYearIds,
                  activityAnalyticsRound,
                  currentPopulationOnly,
              ),
          ])
        : Promise.resolve(null);

    const [
        expectedStudentCount,
        availableClasses,
        availableAcademicTermsRaw,
        combinedData,
        trendDataRaw,
        activityData,
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
        getCombinedAnalytics(
            schoolId,
            classFilter,
            academicYearIds,
            assessmentRound,
            currentPopulationOnly,
        ),
        getTrendData(
            schoolId,
            classFilter,
            academicYearIds,
            assessmentRound,
            currentPopulationOnly,
        ),
        activityDataPromise,
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
    const activityProgressByRisk = activityData
        ? transformActivityProgress(activityData[0])
        : null;
    const activityCompletionSummary = activityData
        ? {
              notStartedStudents: Number(
                  activityData[1].not_started_students,
              ),
              inProgressStudents: Number(activityData[1].in_progress_students),
              completedStudents: Number(activityData[1].completed_students),
              requiringActivityStudents: Number(
                  activityData[1].requiring_activity_students,
              ),
              notRequiringActivityStudents: Number(
                  activityData[1].not_requiring_activity_students,
              ),
          }
        : null;
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
        activityAnalyticsApplicable,
        activityAnalyticsRound,
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
