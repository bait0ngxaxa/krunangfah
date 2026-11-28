import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import type { ExpectedClassCount } from "./coverage";

// Planned student counts come from SchoolClassTerm, one row per class per
// term. Never filter archived classes here: term rows record which classes
// existed in each term, so a past term must still count a class that was
// archived later.
function buildExpectedCountWhere(
    schoolId: string | undefined,
    classFilter: string | undefined,
    academicYearId: string,
): Prisma.SchoolClassTermWhereInput {
    return {
        academicYearId,
        schoolClass: {
            ...(schoolId ? { schoolId } : {}),
            ...(classFilter ? { name: classFilter } : {}),
            school: { disabledAt: null, isTestData: false },
        },
    };
}

export async function getExpectedStudentCount(
    schoolId: string | undefined,
    classFilter?: string,
    academicYearIds?: readonly string[],
): Promise<number | null> {
    if (!academicYearIds || academicYearIds.length !== 1) return null;

    const result = await prisma.schoolClassTerm.aggregate({
        where: buildExpectedCountWhere(schoolId, classFilter, academicYearIds[0]),
        _sum: { expectedStudentCount: true },
    });

    return result._sum.expectedStudentCount;
}

/** Per-class planned counts of one term; [] for a multi-term scope. */
export async function getExpectedClassCounts(
    schoolId: string | undefined,
    classFilter?: string,
    academicYearIds?: readonly string[],
): Promise<ExpectedClassCount[]> {
    if (!academicYearIds || academicYearIds.length !== 1) return [];

    const rows = await prisma.schoolClassTerm.findMany({
        where: buildExpectedCountWhere(schoolId, classFilter, academicYearIds[0]),
        select: {
            expectedStudentCount: true,
            schoolClass: { select: { schoolId: true, name: true } },
        },
    });

    return rows.map((row) => ({
        schoolId: row.schoolClass.schoolId,
        className: row.schoolClass.name,
        expected: row.expectedStudentCount,
    }));
}
