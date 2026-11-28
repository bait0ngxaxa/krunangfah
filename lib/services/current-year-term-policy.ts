import { prisma } from "@/lib/database/prisma";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";

export const NON_CURRENT_YEAR_TERM_MESSAGE =
    "ปีการศึกษาที่เลือกไม่ใช่ปีการศึกษาปัจจุบัน กรุณารีเฟรชหน้าแล้วเลือกใหม่";

export interface CurrentYearTerm {
    id: string;
    year: number;
    semester: number;
}

export type CurrentYearTermCheck =
    | { kind: "allowed"; term: CurrentYearTerm }
    | { kind: "not_found" }
    | { kind: "not_current" };

/**
 * Term-scoped writes (student import, class management) may target only the
 * terms their pages offer: both semesters of the current academic year (same
 * set as getCurrentAcademicYearTerms). A stale tab left open across a year
 * boundary must not write into an older year.
 */
export async function checkCurrentYearTerm(
    academicYearId: string,
    currentYear: number = getCurrentAcademicYear().year,
): Promise<CurrentYearTermCheck> {
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
