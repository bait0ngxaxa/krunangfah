import { Prisma } from "@prisma/client";

export const LATEST_PHQ_ORDER_BY = [
    { academicYear: { year: "desc" } },
    { academicYear: { semester: "desc" } },
    { assessmentRound: "desc" },
    { createdAt: "desc" },
] satisfies Prisma.PhqResultOrderByWithRelationInput[];

/** Activity rows grouped by the same canonical academic PHQ chronology. */
export const LATEST_ACTIVITY_PHQ_ORDER_BY = [
    { phqResult: { academicYear: { year: "desc" } } },
    { phqResult: { academicYear: { semester: "desc" } } },
    { phqResult: { assessmentRound: "desc" } },
    { phqResult: { createdAt: "desc" } },
] satisfies Prisma.ActivityProgressOrderByWithRelationInput[];

/** SQL callers using this fragment must alias phq_results as `pr` and academic_years as `ay`. */
export const LATEST_PHQ_SQL_ORDER_BY = Prisma.sql`
    ay.year DESC,
    ay.semester DESC,
    pr."assessmentRound" DESC,
    pr."createdAt" DESC
`;

interface PhqResultIdentifier {
    id: string;
    academicYear: {
        year: number;
        semester: number;
    };
    assessmentRound: number;
    createdAt: Date;
}

export function comparePhqAcademicChronology(
    left: PhqResultIdentifier,
    right: PhqResultIdentifier,
): number {
    if (left.academicYear.year !== right.academicYear.year) {
        return left.academicYear.year - right.academicYear.year;
    }
    if (left.academicYear.semester !== right.academicYear.semester) {
        return left.academicYear.semester - right.academicYear.semester;
    }
    if (left.assessmentRound !== right.assessmentRound) {
        return left.assessmentRound - right.assessmentRound;
    }
    return left.createdAt.getTime() - right.createdAt.getTime();
}

export function getLatestPhqResult<T extends PhqResultIdentifier>(
    phqResults: readonly T[],
): T | null {
    return phqResults.reduce<T | null>((latest, phqResult) => {
        if (!latest) return phqResult;
        return comparePhqAcademicChronology(phqResult, latest) > 0
            ? phqResult
            : latest;
    }, null);
}

export function getRequestedOrLatestPhqResult<T extends PhqResultIdentifier>(
    phqResults: readonly T[],
    phqResultId?: string,
): T | null {
    if (!phqResultId) {
        return getLatestPhqResult(phqResults);
    }

    return (
        phqResults.find((phqResult) => phqResult.id === phqResultId) ??
        getLatestPhqResult(phqResults)
    );
}

export function isActionableLatestPhqResultId<T extends PhqResultIdentifier>(
    phqResults: readonly T[],
    phqResultId: string,
): boolean {
    const latestPhqResult = getLatestPhqResult(phqResults);
    return latestPhqResult?.id === phqResultId;
}
