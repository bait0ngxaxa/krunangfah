import type { Prisma } from "@prisma/client";
import type {
    SystemActivityRecord,
    SystemCounselingRecord,
    SystemHomeVisitRecord,
    SystemPhqRecord,
    SystemReferralRecord,
} from "./types";

export const COUNSELING_SELECT = {
    id: true,
    studentId: true,
    sessionNumber: true,
    sessionDate: true,
    counselorName: true,
    summary: true,
    createdAt: true,
} satisfies Prisma.CounselingSessionSelect;

export const HOME_VISIT_SELECT = {
    id: true,
    studentId: true,
    visitNumber: true,
    visitDate: true,
    description: true,
    nextScheduledDate: true,
    teacherName: true,
    teacherRole: true,
    createdAt: true,
    _count: { select: { photos: true } },
} satisfies Prisma.HomeVisitSelect;

export const PHQ_SELECT = {
    id: true,
    studentId: true,
    academicYearId: true,
    assessmentRound: true,
    q1: true,
    q2: true,
    q3: true,
    q4: true,
    q5: true,
    q6: true,
    q7: true,
    q8: true,
    q9: true,
    q9a: true,
    q9b: true,
    totalScore: true,
    riskLevel: true,
    referredToHospital: true,
    hospitalName: true,
    createdAt: true,
    academicYear: { select: { year: true, semester: true } },
    student: { select: { schoolId: true } },
} satisfies Prisma.PhqResultSelect;

export const ACTIVITY_SELECT = {
    id: true,
    studentId: true,
    phqResultId: true,
    activityNumber: true,
    status: true,
    unlockedAt: true,
    scheduledDate: true,
    completedAt: true,
    teacherId: true,
    teacherNotes: true,
    internalProblems: true,
    externalProblems: true,
    problemType: true,
    student: { select: { schoolId: true } },
    teacher: { select: { teacher: { select: { firstName: true, lastName: true } } } },
    phqResult: {
        select: {
            assessmentRound: true,
            academicYear: { select: { year: true, semester: true } },
        },
    },
} satisfies Prisma.ActivityProgressSelect;

export const REFERRAL_SELECT = {
    id: true,
    studentId: true,
    fromTeacherUserId: true,
    toTeacherUserId: true,
    createdAt: true,
    student: { select: { schoolId: true } },
    fromTeacher: { select: { teacher: { select: { firstName: true, lastName: true } } } },
    toTeacher: { select: { teacher: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.StudentReferralSelect;

export function toCounselingRecord(row: {
    id: string;
    sessionNumber: number;
    sessionDate: Date;
    counselorName: string;
    summary: string;
    createdAt: Date;
}): SystemCounselingRecord {
    return { ...row };
}

export function toHomeVisitRecord(row: {
    id: string;
    visitNumber: number;
    visitDate: Date;
    description: string;
    nextScheduledDate: Date | null;
    teacherName: string;
    teacherRole: string;
    createdAt: Date;
    _count: { photos: number };
}): SystemHomeVisitRecord {
    return { ...row, photoCount: row._count.photos };
}

export function toPhqRecord(row: PhqRow): SystemPhqRecord {
    return {
        ...row,
        academicYearLabel: `${row.academicYear.year}/${row.academicYear.semester}`,
    };
}

export function toActivityRecord(row: ActivityRow): SystemActivityRecord {
    return {
        ...row,
        academicYearLabel: `${row.phqResult.academicYear.year}/${row.phqResult.academicYear.semester}`,
        assessmentRound: row.phqResult.assessmentRound,
        teacherName: row.teacher?.teacher
            ? formatTeacherName(row.teacher.teacher)
            : null,
    };
}

export function toReferralRecord(row: ReferralRow): SystemReferralRecord {
    return {
        id: row.id,
        fromTeacherUserId: row.fromTeacherUserId,
        toTeacherUserId: row.toTeacherUserId,
        fromTeacherName: formatTeacherName(row.fromTeacher.teacher),
        toTeacherName: formatTeacherName(row.toTeacher.teacher),
        createdAt: row.createdAt,
    };
}

function formatTeacherName(
    teacher: { firstName: string; lastName: string } | null,
): string | null {
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : null;
}

export type PhqRow = Prisma.PhqResultGetPayload<{
    select: typeof PHQ_SELECT;
}>;

export type ActivityRow = Prisma.ActivityProgressGetPayload<{
    select: typeof ACTIVITY_SELECT;
}>;

export type ReferralRow = Prisma.StudentReferralGetPayload<{
    select: typeof REFERRAL_SELECT;
}>;
