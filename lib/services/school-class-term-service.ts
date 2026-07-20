import { prisma } from "@/lib/database/prisma";

async function resolveAcademicYearId(
    academicYearId?: string,
): Promise<string | null> {
    if (academicYearId) {
        const academicYear = await prisma.academicYear.findUnique({
            where: { id: academicYearId },
            select: { id: true },
        });

        return academicYear?.id ?? null;
    }

    const academicYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        select: { id: true },
    });

    if (academicYear) return academicYear.id;

    const latestAcademicYear = await prisma.academicYear.findFirst({
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        select: { id: true },
    });

    return latestAcademicYear?.id ?? null;
}

export async function upsertCurrentSchoolClassTerm(
    schoolClassId: string,
    expectedStudentCount: number,
    academicYearId?: string,
): Promise<void> {
    const resolvedAcademicYearId = await resolveAcademicYearId(academicYearId);
    if (!resolvedAcademicYearId) return;

    await prisma.schoolClassTerm.upsert({
        where: {
            schoolClassId_academicYearId: {
                schoolClassId,
                academicYearId: resolvedAcademicYearId,
            },
        },
        create: {
            schoolClassId,
            academicYearId: resolvedAcademicYearId,
            expectedStudentCount,
        },
        update: {
            expectedStudentCount,
        },
    });
}

function compareAcademicYearOrder(
    left: { year: number; semester: number },
    right: { year: number; semester: number },
): number {
    if (left.year !== right.year) return left.year - right.year;
    return left.semester - right.semester;
}

function findPreviousTermCount(
    terms: Array<{
        expectedStudentCount: number;
        academicYear: { year: number; semester: number };
    }>,
    targetAcademicYear: { year: number; semester: number },
): number | null {
    const previousTerms = terms
        .filter(
            (term) =>
                compareAcademicYearOrder(
                    term.academicYear,
                    targetAcademicYear,
                ) < 0,
        )
        .sort((left, right) =>
            compareAcademicYearOrder(right.academicYear, left.academicYear),
        );

    return previousTerms[0]?.expectedStudentCount ?? null;
}

export async function ensureSchoolClassTermsForAcademicYear(
    schoolId: string,
    academicYearId?: string,
): Promise<string | null> {
    const resolvedAcademicYearId = await resolveAcademicYearId(academicYearId);
    if (!resolvedAcademicYearId) return null;

    const targetAcademicYear = await prisma.academicYear.findUnique({
        where: { id: resolvedAcademicYearId },
        select: { id: true, year: true, semester: true },
    });
    if (!targetAcademicYear) return null;

    const classes = await prisma.schoolClass.findMany({
        where: { schoolId },
        select: {
            id: true,
            expectedStudentCount: true,
            terms: {
                select: {
                    academicYearId: true,
                    expectedStudentCount: true,
                    academicYear: { select: { year: true, semester: true } },
                },
            },
        },
    });

    const missingTermRows = classes
        .filter(
            (schoolClass) =>
                !schoolClass.terms.some(
                    (term) => term.academicYearId === resolvedAcademicYearId,
                ),
        )
        .map((schoolClass) => ({
            schoolClassId: schoolClass.id,
            academicYearId: resolvedAcademicYearId,
            expectedStudentCount:
                findPreviousTermCount(schoolClass.terms, targetAcademicYear) ??
                schoolClass.expectedStudentCount,
        }));

    if (missingTermRows.length > 0) {
        await prisma.schoolClassTerm.createMany({
            data: missingTermRows,
            skipDuplicates: true,
        });
    }

    return resolvedAcademicYearId;
}
