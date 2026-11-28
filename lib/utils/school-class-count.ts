/** Shown for a class that has no SchoolClassTerm row in the selected term. */
export const CLASS_NOT_IN_TERM_LABEL = "ไม่มีในเทอมนี้";

interface TermScopedCount {
    expectedStudentCount: number | null;
}

/** A class absent from the term adds nothing to that term's denominator. */
export function sumExpectedStudentCounts(
    classes: ReadonlyArray<TermScopedCount>,
): number {
    return classes.reduce(
        (sum, schoolClass) => sum + (schoolClass.expectedStudentCount ?? 0),
        0,
    );
}

export function formatClassStudentCount(count: number | null): string {
    return count === null ? CLASS_NOT_IN_TERM_LABEL : `${count} คน`;
}
