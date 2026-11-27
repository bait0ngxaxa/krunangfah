import { prisma } from "@/lib/database/prisma";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";

export const NON_CURRENT_IMPORT_TERM_MESSAGE =
    "ปีการศึกษาที่เลือกไม่ใช่ปีการศึกษาปัจจุบัน กรุณารีเฟรชหน้าแล้วเลือกใหม่";

export interface ImportTerm {
    id: string;
    year: number;
    semester: number;
}

export type ImportTermCheck =
    | { kind: "allowed"; term: ImportTerm }
    | { kind: "not_found" }
    | { kind: "not_current" };

/**
 * Imports may target only the terms the import page offers: both semesters
 * of the current academic year (same set as getCurrentAcademicYearTerms).
 * Older years would revert promoted classes and corrected names.
 */
export async function checkImportTerm(
    academicYearId: string,
    currentYear: number = getCurrentAcademicYear().year,
): Promise<ImportTermCheck> {
    // Server-action input: the client always sends a selected term id.
    if (typeof academicYearId !== "string" || academicYearId.length === 0) {
        return { kind: "not_found" };
    }
    const term = await prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { id: true, year: true, semester: true },
    });
    if (!term) return { kind: "not_found" };
    if (term.year !== currentYear) return { kind: "not_current" };
    return { kind: "allowed", term };
}
