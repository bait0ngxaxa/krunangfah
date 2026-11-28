import { prisma } from "@/lib/database/prisma";
import {
    checkCurrentYearTerm,
    NON_CURRENT_YEAR_TERM_MESSAGE,
} from "@/lib/services/current-year-term-policy";
import {
    compareAcademicYearOrder,
    resolveSchoolClassTerm,
} from "@/lib/services/school-class-term-service";

export interface ClassTermWritePlan {
    /** Term whose row the write targets; null only when no term exists yet. */
    targetTermId: string | null;
    /** Only current-term edits may also change SchoolClass.expectedStudentCount. */
    writesClassCount: boolean;
    /** Terms a newly added class must exist in, oldest first. */
    newClassTermIds: string[];
}

export type ClassTermWritePlanResult =
    | { ok: true; plan: ClassTermWritePlan }
    | { ok: false; message: string };

interface TermOrder {
    id: string;
    year: number;
    semester: number;
}

async function findCurrentTerm(): Promise<TermOrder | null> {
    return prisma.academicYear.findFirst({
        where: { isCurrent: true },
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        select: { id: true, year: true, semester: true },
    });
}

/**
 * Every existing term between two terms, inclusive, oldest first. A class
 * added to an earlier term also exists in each later term up to now.
 */
async function listTermIdsBetween(
    first: TermOrder,
    second: TermOrder,
): Promise<string[]> {
    const [from, to] =
        compareAcademicYearOrder(first, second) <= 0
            ? [first, second]
            : [second, first];
    const terms = await prisma.academicYear.findMany({
        where: { year: { gte: from.year, lte: to.year } },
        orderBy: [{ year: "asc" }, { semester: "asc" }],
        select: { id: true, year: true, semester: true },
    });

    return terms
        .filter(
            (term) =>
                compareAcademicYearOrder(term, from) >= 0 &&
                compareAcademicYearOrder(term, to) <= 0,
        )
        .map((term) => term.id);
}

async function planForDefaultTerm(): Promise<ClassTermWritePlan> {
    const target = await resolveSchoolClassTerm();
    return {
        targetTermId: target?.id ?? null,
        writesClassCount: true,
        newClassTermIds: target ? [target.id] : [],
    };
}

/**
 * Validates the term a class-management write targets and derives which rows
 * it may touch. Only terms of the current academic year are writable.
 */
export async function resolveClassTermWritePlan(
    academicYearId?: string,
): Promise<ClassTermWritePlanResult> {
    if (academicYearId === undefined) {
        return { ok: true, plan: await planForDefaultTerm() };
    }

    const check = await checkCurrentYearTerm(academicYearId);
    if (check.kind !== "allowed") {
        return { ok: false, message: NON_CURRENT_YEAR_TERM_MESSAGE };
    }

    const current = await findCurrentTerm();
    const isCurrentTarget = current?.id === check.term.id;
    const newClassTermIds = current
        ? await listTermIdsBetween(check.term, current)
        : [check.term.id];

    return {
        ok: true,
        plan: {
            targetTermId: check.term.id,
            writesClassCount: isCurrentTarget,
            newClassTermIds,
        },
    };
}

export interface CreatedSchoolClass {
    id: string;
    name: string;
    expectedStudentCount: number;
}

/**
 * Creates the class and all of its term rows atomically, so a failed row
 * never leaves a class that is missing from a term it was added to.
 */
export async function createSchoolClassWithTerms(input: {
    schoolId: string;
    name: string;
    expectedStudentCount: number;
    termIds: string[];
}): Promise<CreatedSchoolClass> {
    return prisma.$transaction(async (tx) => {
        const schoolClass = await tx.schoolClass.create({
            data: {
                schoolId: input.schoolId,
                name: input.name,
                expectedStudentCount: input.expectedStudentCount,
            },
            select: { id: true, name: true, expectedStudentCount: true },
        });

        for (const academicYearId of input.termIds) {
            await tx.schoolClassTerm.create({
                data: {
                    schoolClassId: schoolClass.id,
                    academicYearId,
                    expectedStudentCount: input.expectedStudentCount,
                },
            });
        }

        return schoolClass;
    });
}

/**
 * Sets one term's count. The class-level count follows only the current
 * term, so editing a past term never rewrites today's number.
 */
export async function updateSchoolClassTermCount(input: {
    schoolClassId: string;
    expectedStudentCount: number;
    plan: ClassTermWritePlan;
}): Promise<void> {
    const { schoolClassId, expectedStudentCount, plan } = input;

    await prisma.$transaction(async (tx) => {
        if (plan.writesClassCount) {
            await tx.schoolClass.update({
                where: { id: schoolClassId },
                data: { expectedStudentCount },
            });
        }
        if (!plan.targetTermId) return;

        await tx.schoolClassTerm.upsert({
            where: {
                schoolClassId_academicYearId: {
                    schoolClassId,
                    academicYearId: plan.targetTermId,
                },
            },
            create: {
                schoolClassId,
                academicYearId: plan.targetTermId,
                expectedStudentCount,
            },
            update: { expectedStudentCount },
        });
    });
}
