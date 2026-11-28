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
} from "./transforms";
import {
    calculateScreeningCoverage,
    mergeClassCoverageCounts,
    type ExpectedClassCount,
} from "./coverage";
import { getExpectedClassCounts } from "./expected-counts";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/services/school-class-term-service";
import { canGenerateActivitiesForAssessmentRound } from "@/lib/actions/activity/constants";
import { ACTIVITY_ANALYTICS_ROUND } from "./constants";

import type { AnalyticsData } from "./types";
import type { CombinedAnalyticsResult } from "./queries";

export { getExpectedStudentCount } from "./expected-counts";

interface CoverageFields {
    totalStudents: number | null;
    studentsWithoutAssessment: number | null;
    screeningCoveragePercent: number | null;
    coverageCountMismatches: AnalyticsData["coverageCountMismatches"];
    coverageUncountedStudents: number;
}

/**
 * Coverage needs one term's planned counts; a multi-term scope (no rows)
 * keeps every coverage figure null. A single term without any term row also
 * has no planned total, but its screened classes still show as mismatches.
 */
function buildCoverageFields(
    expectedRows: readonly ExpectedClassCount[],
    assessedByClass: CombinedAnalyticsResult["assessedByClass"],
    isSingleTerm: boolean,
): CoverageFields {
    if (!isSingleTerm) {
        return {
            totalStudents: null,
            studentsWithoutAssessment: null,
            screeningCoveragePercent: null,
            coverageCountMismatches: [],
            coverageUncountedStudents: 0,
        };
    }
    const coverage = calculateScreeningCoverage(
        mergeClassCoverageCounts(expectedRows, assessedByClass),
    );
    const hasTermRows = expectedRows.length > 0;
    return {
        totalStudents: hasTermRows ? coverage.expectedTotal : null,
        studentsWithoutAssessment: hasTermRows
            ? coverage.studentsWithoutAssessment
            : null,
        screeningCoveragePercent: coverage.coveragePercent,
        coverageCountMismatches: coverage.mismatches,
        coverageUncountedStudents: coverage.uncountedStudents,
    };
}

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
        expectedClassCounts,
        availableClasses,
        availableAcademicTermsRaw,
        combinedData,
        trendDataRaw,
        activityData,
        availableRounds,
        legacyClassAttribution,
    ] = await Promise.all([
        getExpectedClassCounts(schoolId, selectedClass, academicYearIds),
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
        assessedByClass,
    } = combinedData;

    const studentsWithAssessment = riskLevelCountsRaw.reduce(
        (sum, r) => sum + Number(r.count),
        0,
    );
    const coverageFields = buildCoverageFields(
        expectedClassCounts,
        assessedByClass,
        academicYearIds?.length === 1,
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
        ...coverageFields,
        riskLevelSummary,
        studentsWithAssessment,
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
