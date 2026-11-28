import {
    checkCurrentYearTerm,
    NON_CURRENT_YEAR_TERM_MESSAGE,
    type CurrentYearTerm,
    type CurrentYearTermCheck,
} from "@/lib/services/current-year-term-policy";

export const NON_CURRENT_IMPORT_TERM_MESSAGE = NON_CURRENT_YEAR_TERM_MESSAGE;

export type ImportTerm = CurrentYearTerm;

export type ImportTermCheck = CurrentYearTermCheck;

/**
 * Imports may target only the terms the import page offers: both semesters
 * of the current academic year. Older years would revert promoted classes and
 * corrected names. The rule itself lives in current-year-term-policy.
 */
export async function checkImportTerm(
    academicYearId: string,
    currentYear?: number,
): Promise<ImportTermCheck> {
    return checkCurrentYearTerm(academicYearId, currentYear);
}
