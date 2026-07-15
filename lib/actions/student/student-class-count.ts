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

export interface StudentClassContributionState {
    className: string;
    status: StudentStatusValue;
    disabledAt: Date | null;
}

export interface StudentClassCountAdjustment {
    className: string;
    delta: number;
}

export interface StudentStatusState {
    statusChangedAt: Date | null;
    leftAt: Date | null;
}

export const STUDENT_CLASS_COUNT_INTEGRITY_MESSAGE =
    "จำนวนคาดการณ์ของห้องไม่สอดคล้องกับข้อมูลนักเรียน กรุณาตรวจสอบข้อมูลห้องเรียน";

export class StudentClassCountIntegrityError extends Error {
    constructor() {
        super(STUDENT_CLASS_COUNT_INTEGRITY_MESSAGE);
        this.name = "StudentClassCountIntegrityError";
    }
}

interface ApplyStudentClassCountAdjustmentsInput {
    schoolId: string;
    academicYearId: string | null;
    adjustments: StudentClassCountAdjustment[];
}

export function calculateStudentClassCountAdjustments(
    transition: StudentClassCountTransition,
): StudentClassCountAdjustment[] {
    return calculateStudentContributionAdjustments({
        before: {
            className: transition.oldClassName,
            status: transition.oldStatus,
            disabledAt: null,
        },
        after: {
            className: transition.newClassName,
            status: transition.newStatus,
            disabledAt: null,
        },
    });
}

export function getStudentClassContribution(
    state: StudentClassContributionState,
): 0 | 1 {
    return state.disabledAt === null &&
        !isStudentCountExcludedStatus(state.status)
        ? 1
        : 0;
}

export function calculateStudentContributionAdjustments(input: {
    before: StudentClassContributionState;
    after: StudentClassContributionState;
}): StudentClassCountAdjustment[] {
    const adjustments = new Map<string, number>();
    addClassDelta(
        adjustments,
        input.before.className,
        -getStudentClassContribution(input.before),
    );
    addClassDelta(
        adjustments,
        input.after.className,
        getStudentClassContribution(input.after),
    );

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

    const adjustments = [...input.adjustments].sort((left, right) =>
        left.className.localeCompare(right.className),
    );
    for (const adjustment of adjustments) {
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
        },
    });

    if (!schoolClass) throw new StudentClassCountIntegrityError();

    const lockedClass = await tx.schoolClass.update({
        where: { id: schoolClass.id },
        data: { expectedStudentCount: { increment: 0 } },
        select: { id: true, expectedStudentCount: true },
    });

    const term = await tx.schoolClassTerm.upsert({
        where: {
            schoolClassId_academicYearId: {
                schoolClassId: schoolClass.id,
                academicYearId,
            },
        },
        create: {
            schoolClassId: schoolClass.id,
            academicYearId,
            expectedStudentCount: lockedClass.expectedStudentCount,
        },
        update: { expectedStudentCount: { increment: 0 } },
        select: { id: true },
    });

    await applyAtomicCountAdjustment(
        tx.schoolClass,
        lockedClass.id,
        adjustment.delta,
    );
    await applyAtomicCountAdjustment(
        tx.schoolClassTerm,
        term.id,
        adjustment.delta,
    );
}

interface AtomicCountModel {
    updateMany: (input: {
        where: {
            id: string;
            expectedStudentCount?: { gte: number };
        };
        data: {
            expectedStudentCount: {
                increment?: number;
                decrement?: number;
            };
        };
    }) => Promise<{ count: number }>;
}

async function applyAtomicCountAdjustment(
    model: AtomicCountModel,
    id: string,
    delta: number,
): Promise<void> {
    const result =
        delta < 0
            ? await model.updateMany({
                  where: {
                      id,
                      expectedStudentCount: { gte: Math.abs(delta) },
                  },
                  data: { expectedStudentCount: { decrement: Math.abs(delta) } },
              })
            : await model.updateMany({
                  where: { id },
                  data: { expectedStudentCount: { increment: delta } },
              });

    if (result.count !== 1) {
        throw new StudentClassCountIntegrityError();
    }
}

function addClassDelta(
    adjustments: Map<string, number>,
    className: string,
    delta: number,
): void {
    adjustments.set(className, (adjustments.get(className) ?? 0) + delta);
}
