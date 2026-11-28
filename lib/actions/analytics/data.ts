import { prisma } from "@/lib/database/prisma";
import {
    getCombinedAnalytics,
    getTrendData,
    getActivityProgressByRisk,
    getActivityCompletionSummary,
    type AnalyticsClassScope,
} from "./queries";
import {
    getAvailableAcademicTerms,
    getAvailableClassNames,
    getAvailableRounds,
    hasLegacyClassAttribution,
} from "./filter-options";
import {
    transformRiskLevelCounts,
    transformTrendData,
    transformGradeRiskData,
    transformActivityProgress,
    transformHospitalReferrals,
    calculateScreeningCoveragePercent,
} from "./transforms";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/services/school-class-term-service";
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
    const selectedClass = targetClass || undefined;
    // A class teacher's class is visibility (current class), never a report
    // filter; only admins choose a report class.
    const classes: AnalyticsClassScope = role === "class_teacher"
        ? { scopeClass: selectedClass }
        : { classFilter: selectedClass };
    const academicYear = academicYearStr ? parseInt(academicYearStr, 10) : undefined;
    const semester = semesterStr ? parseInt(semesterStr, 10) : undefined;
    const assessmentRound = roundStr ? parseInt(roundStr, 10) : undefined;
    // "all" is a screening scope, not an assessment round. Activity ownership
    // remains Round 1 unless the user explicitly selects terminal Round 2.
    const activityAnalyticsApplicable =
        assessmentRound === undefined ||
        canGenerateActivitiesForAssessmentRound(assessmentRound);
    const activityAnalyticsRound = activityAnalyticsApplicable
        ? ACTIVITY_ANALYTICS_ROUND
        : null;

    // Runs inside unstable_cache, which must not run the lifecycle (it may
    // invalidate caches). Callers resolve the current term first.
    if (academicYear === undefined && semester === undefined) {
        throw new Error(
            "fetchAnalyticsData requires an explicit academic year or semester",
        );
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
    const singleTerm = selectedAcademicYears?.length === 1
        ? selectedAcademicYears[0]
        : undefined;
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
                  classes,
                  academicYearIds,
                  activityAnalyticsRound,
                  currentPopulationOnly,
              ),
              getActivityCompletionSummary(
                  schoolId,
                  classes,
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
        availableRounds,
        legacyClassAttribution,
    ] = await Promise.all([
        getExpectedStudentCount(schoolId, selectedClass, academicYearIds),
        showClassFilter
            ? getAvailableClassNames(schoolId, selectedAcademicYears)
            : Promise.resolve([]),
        getAvailableAcademicTerms(schoolId, classes),
        getCombinedAnalytics(
            schoolId,
            classes,
            academicYearIds,
            assessmentRound,
            currentPopulationOnly,
        ),
        getTrendData(
            schoolId,
            classes,
            academicYearIds,
            assessmentRound,
            currentPopulationOnly,
        ),
        activityDataPromise,
        getAvailableRounds(schoolId, classes, { academicYear, semester }),
        hasLegacyClassAttribution({
            schoolId,
            isClassTeacherView: classes.scopeClass !== undefined,
            singleTerm,
            assessmentRound,
        }),
    ]);

    const availableAcademicTerms = availableAcademicTermsRaw.map((term) => ({
        id: term.id,
        year: term.year,
        semester: term.semester,
    }));

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
        currentClass: selectedClass,
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
        legacyClassAttribution,
    };
}

export async function getExpectedStudentCount(
    schoolId: string | undefined,
    classFilter?: string,
    academicYearIds?: readonly string[],
): Promise<number | null> {
    if (!academicYearIds || academicYearIds.length !== 1) return null;

    // Never filter archived classes here: term rows record which classes
    // existed in each term, so a past term must still count a class that
    // was archived later.
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
