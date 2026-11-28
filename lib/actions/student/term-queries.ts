/**
 * Term lookups for the students dashboard. Read-only: they never call the
 * academic-year lifecycle, which writes on every call (backlog M4).
 */

import { prisma } from "@/lib/database/prisma";
import { buildStudentVisibilityWhere } from "./student-scope";
import type { AvailableStudentTerm } from "./types";

/** The `isCurrent` term (id and academic year), or null when none is marked. */
export async function getCurrentAcademicTermQuery(): Promise<{
    id: string;
    year: number;
} | null> {
    return prisma.academicYear.findFirst({
        where: { isCurrent: true },
        select: { id: true, year: true },
    });
}

/**
 * Terms (newest first) with at least one PHQ result for a student the viewer
 * can see, plus the rounds present in each. Uses the list's visibility scope
 * without the current-population filter, because a selected past term lists
 * students regardless of their current status.
 */
export async function getAvailableTermsQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
): Promise<AvailableStudentTerm[]> {
    const rows = await prisma.phqResult.groupBy({
        by: ["academicYearId", "assessmentRound"],
        where: {
            student: buildStudentVisibilityWhere(
                schoolId,
                advisoryClass,
                userRole,
            ),
        },
    });
    if (rows.length === 0) return [];

    const roundsByTerm = new Map<string, Set<number>>();
    for (const row of rows) {
        const rounds = roundsByTerm.get(row.academicYearId) ?? new Set<number>();
        rounds.add(row.assessmentRound);
        roundsByTerm.set(row.academicYearId, rounds);
    }

    const terms = await prisma.academicYear.findMany({
        where: { id: { in: [...roundsByTerm.keys()] } },
        select: { id: true, year: true, semester: true },
        orderBy: [{ year: "desc" }, { semester: "desc" }],
    });
    return terms.map((term) => ({
        ...term,
        rounds: [...(roundsByTerm.get(term.id) ?? [])].sort((a, b) => a - b),
    }));
}
