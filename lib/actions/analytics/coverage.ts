import type { CoverageCountMismatch } from "./types";

/**
 * Screening coverage is capped per class, then summed. Capping only the total
 * would let a class screened above its planned count hide another class's
 * unscreened students, and silently report 100%.
 */

export interface ClassCoverageCount {
    /** Distinguishes equal class names across schools in the system overview. */
    schoolId: string;
    className: string;
    expected: number;
    assessed: number;
}

export interface ExpectedClassCount {
    schoolId: string;
    className: string;
    expected: number;
}

export interface AssessedClassCount {
    schoolId: string;
    className: string;
    assessed: number;
}

export interface ScreeningCoverage {
    /** null when no class has a planned count (nothing to divide by). */
    coveragePercent: number | null;
    expectedTotal: number;
    covered: number;
    studentsWithoutAssessment: number;
    mismatches: CoverageCountMismatch[];
    /** Screened students above their class's planned count. */
    uncountedStudents: number;
    schoolsWithMismatch: number;
}

function classKey(schoolId: string, className: string): string {
    return JSON.stringify([schoolId, className]);
}

/**
 * Joins planned and screened counts per class. A class with results but no
 * term row gets expected 0, so every screened student lands in a class.
 */
export function mergeClassCoverageCounts(
    expected: readonly ExpectedClassCount[],
    assessed: readonly AssessedClassCount[],
): ClassCoverageCount[] {
    const byClass = new Map<string, ClassCoverageCount>();
    const entryFor = (schoolId: string, className: string): ClassCoverageCount => {
        const key = classKey(schoolId, className);
        const existing = byClass.get(key);
        if (existing) return existing;
        const created = { schoolId, className, expected: 0, assessed: 0 };
        byClass.set(key, created);
        return created;
    };

    for (const row of expected) {
        entryFor(row.schoolId, row.className).expected += row.expected;
    }
    for (const row of assessed) {
        entryFor(row.schoolId, row.className).assessed += row.assessed;
    }
    return Array.from(byClass.values());
}

function compareMismatches(
    left: CoverageCountMismatch,
    right: CoverageCountMismatch,
): number {
    const overDiff =
        right.assessed - right.expected - (left.assessed - left.expected);
    return overDiff !== 0
        ? overDiff
        : left.className.localeCompare(right.className, "th");
}

export function calculateScreeningCoverage(
    classes: readonly ClassCoverageCount[],
): ScreeningCoverage {
    let expectedTotal = 0;
    let covered = 0;
    let studentsWithoutAssessment = 0;
    const mismatches: CoverageCountMismatch[] = [];
    const schoolsWithMismatch = new Set<string>();

    for (const { schoolId, className, expected, assessed } of classes) {
        expectedTotal += expected;
        covered += Math.min(assessed, expected);
        studentsWithoutAssessment += Math.max(0, expected - assessed);
        if (assessed > expected) {
            mismatches.push({ className, expected, assessed });
            schoolsWithMismatch.add(schoolId);
        }
    }

    mismatches.sort(compareMismatches);
    return {
        coveragePercent:
            expectedTotal > 0
                ? Math.round((covered / expectedTotal) * 100)
                : null,
        expectedTotal,
        covered,
        studentsWithoutAssessment,
        mismatches,
        uncountedStudents: mismatches.reduce(
            (sum, row) => sum + row.assessed - row.expected,
            0,
        ),
        schoolsWithMismatch: schoolsWithMismatch.size,
    };
}
