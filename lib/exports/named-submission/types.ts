import type { Prisma } from "@prisma/client";

export interface NamedSubmissionFilters {
    schoolId?: string;
    className?: string;
    academicYear?: number;
    semester?: number;
    assessmentRound?: number;
}

export const namedSubmissionSelect = {
    id: true,
    assessmentRound: true,
    totalScore: true,
    riskLevel: true,
    referredToHospital: true,
    createdAt: true,
    academicYear: {
        select: { year: true, semester: true },
    },
    student: {
        select: {
            studentId: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            class: true,
            status: true,
            school: {
                select: { name: true, province: true },
            },
        },
    },
} as const satisfies Prisma.PhqResultSelect;

export type NamedSubmissionRecord = Prisma.PhqResultGetPayload<{
    select: typeof namedSubmissionSelect;
}>;

export interface NamedSubmissionRow {
    schoolName: string;
    province: string;
    studentId: string;
    firstName: string;
    lastName: string;
    nationalId: string;
    className: string;
    studentStatus: string;
    academicYear: number;
    semester: number;
    assessmentRound: number;
    assessmentDate: string;
    totalScore: number;
    riskGroup: string;
    referralStatus: string;
}
