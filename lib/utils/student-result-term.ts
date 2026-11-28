/**
 * Which term a student's displayed PHQ result came from. One definition for
 * the rows, the "not screened this term" badge and the tests.
 */

interface ResultWithTerm {
    assessmentRound?: number;
    academicYear?: { id: string; year: number; semester: number };
}

/** e.g. "2568/2 รอบ 1"; null when the result has no term attached. */
export function formatResultTermLabel(
    result: ResultWithTerm | undefined,
): string | null {
    if (!result?.academicYear) return null;
    const { year, semester } = result.academicYear;
    const round = result.assessmentRound ? ` รอบ ${result.assessmentRound}` : "";
    return `${year}/${semester}${round}`;
}

/**
 * True when the latest result is from a term other than the current one.
 * Unknown (no current term, or no term on the result) is never flagged.
 */
export function isNotScreenedThisTerm(
    result: ResultWithTerm | undefined,
    currentAcademicYearId: string | null | undefined,
): boolean {
    if (!currentAcademicYearId || !result?.academicYear) return false;
    return result.academicYear.id !== currentAcademicYearId;
}

/**
 * Which results the page summarises: the pie chart title and the summary
 * subtitle use the same phrase.
 */
export function buildScreeningScopeLabel(input: {
    isTermSelected: boolean;
    selectedTerm: { year: number; semester: number } | null | undefined;
    assessmentRound?: number;
}): string {
    if (!input.isTermSelected) return "ผลคัดกรองล่าสุดของนักเรียนแต่ละคน";
    if (!input.selectedTerm) return "ผลคัดกรองเทอมที่เลือก";
    const { year, semester } = input.selectedTerm;
    const round = input.assessmentRound ? ` รอบ ${input.assessmentRound}` : "";
    return `ผลคัดกรอง ปีการศึกษา ${year} เทอม ${semester}${round}`;
}
