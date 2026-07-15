import type { Prisma } from "@prisma/client";
import {
    isStudentCountExcludedStatus,
    type StudentStatusValue,
} from "@/lib/constants/student-status";

export interface StudentClassCountTransition {
    oldClassName: string;
    newClassName: string;
    oldStatus: StudentStatusValue;
    newStatus: StudentStatusValue;
}

export interface StudentClassCountAdjustment {
    className: string;
    delta: number;
}

export interface StudentStatusState {
    statusChangedAt: Date | null;
    leftAt: Date | null;
}

interface ApplyStudentClassCountAdjustmentsInput {
    schoolId: string;
    academicYearId: string | null;
    adjustments: StudentClassCountAdjustment[];
}

export function calculateStudentClassCountAdjustments(
    transition: StudentClassCountTransition,
): StudentClassCountAdjustment[] {
    const adjustments = new Map<string, number>();
    const oldContribution = isStudentCountExcludedStatus(transition.oldStatus)
        ? 0
        : 1;
    const newContribution = isStudentCountExcludedStatus(transition.newStatus)
        ? 0
        : 1;

    addClassDelta(adjustments, transition.oldClassName, -oldContribution);
    addClassDelta(adjustments, transition.newClassName, newContribution);

    return [...adjustments.entries()]
        .filter(([, delta]) => delta !== 0)
        .map(([className, delta]) => ({ className, delta }));
}

export function calculateStudentStatusState(input: {
    oldStatus: StudentStatusValue;
    newStatus: StudentStatusValue;
    statusChangedAt: Date | null;
    leftAt: Date | null;
    now?: Date;
}): StudentStatusState {
    if (input.oldStatus === input.newStatus) {
        return {
            statusChangedAt: input.statusChangedAt,
            leftAt: input.leftAt,
        };
    }

    const now = input.now ?? new Date();
    const newStatusExcluded = isStudentCountExcludedStatus(input.newStatus);
    const oldStatusExcluded = isStudentCountExcludedStatus(input.oldStatus);

    return {
        statusChangedAt: now,
        leftAt: newStatusExcluded
            ? oldStatusExcluded
                ? input.leftAt
                : now
            : null,
    };
}

export async function getCurrentAcademicYearId(
    tx: Prisma.TransactionClient,
): Promise<string | null> {
    const currentAcademicYear = await tx.academicYear.findFirst({
        where: { isCurrent: true },
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        select: { id: true },
    });

    if (currentAcademicYear) return currentAcademicYear.id;

    const latestAcademicYear = await tx.academicYear.findFirst({
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        select: { id: true },
    });

    return latestAcademicYear?.id ?? null;
}

export async function applyStudentClassCountAdjustments(
    tx: Prisma.TransactionClient,
    input: ApplyStudentClassCountAdjustmentsInput,
): Promise<void> {
    if (!input.academicYearId || input.adjustments.length === 0) return;

    for (const adjustment of input.adjustments) {
        await applyClassCountAdjustment(tx, input, adjustment);
    }
}

async function applyClassCountAdjustment(
    tx: Prisma.TransactionClient,
    input: ApplyStudentClassCountAdjustmentsInput,
    adjustment: StudentClassCountAdjustment,
): Promise<void> {
    const academicYearId = input.academicYearId;
    if (!academicYearId) return;

    const schoolClass = await tx.schoolClass.findUnique({
        where: {
            schoolId_name: {
                schoolId: input.schoolId,
                name: adjustment.className,
            },
        },
        select: {
            id: true,
            expectedStudentCount: true,
            terms: {
                where: { academicYearId },
                select: { expectedStudentCount: true },
                take: 1,
            },
        },
    });

    if (!schoolClass) return;

    const baseCount =
        schoolClass.terms[0]?.expectedStudentCount ??
        schoolClass.expectedStudentCount;
    const nextCount = Math.max(0, baseCount + adjustment.delta);

    await tx.schoolClass.update({
        where: { id: schoolClass.id },
        data: { expectedStudentCount: nextCount },
    });
    await tx.schoolClassTerm.upsert({
        where: {
            schoolClassId_academicYearId: {
                schoolClassId: schoolClass.id,
                academicYearId,
            },
        },
        create: {
            schoolClassId: schoolClass.id,
            academicYearId,
            expectedStudentCount: nextCount,
        },
        update: { expectedStudentCount: nextCount },
    });
}

function addClassDelta(
    adjustments: Map<string, number>,
    className: string,
    delta: number,
): void {
    adjustments.set(className, (adjustments.get(className) ?? 0) + delta);
}
