import { prisma } from "@/lib/database/prisma";
import type { SystemCareRecordResponse } from "./types";
import {
    COUNSELING_SELECT,
    HOME_VISIT_SELECT,
    toCounselingRecord,
    toHomeVisitRecord,
} from "./care-records-selects";
import { getStudentReferralHistory } from "@/lib/services/student-referral-history";

export async function getStudentCareRecords(
    studentId: string,
): Promise<SystemCareRecordResponse | null> {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, schoolId: true },
    });
    if (!student) return null;

    const [
        phqResults,
        activityProgress,
        referralHistory,
        teacherOptions,
        counselingSessions,
        homeVisits,
    ] = await Promise.all([
        getPhqSummaries(studentId),
        getActivitySummaries(studentId),
        getStudentReferralHistory(studentId, { id: studentId }),
        getTeacherOptions(student.schoolId),
        getCounselingRecords(studentId),
        getHomeVisitRecords(studentId),
    ]);

    const referral = referralHistory.find(
        (record) => record.status === "active",
    ) ?? null;

    return {
        phqResults,
        activityProgress,
        referral,
        referralHistory,
        teacherOptions,
        counselingSessions,
        homeVisits,
    };
}

async function getPhqSummaries(studentId: string) {
    const rows = await prisma.phqResult.findMany({
        where: { studentId },
        select: {
            id: true,
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
            updatedAt: true,
            academicYear: { select: { year: true, semester: true } },
        },
        orderBy: [
            { academicYear: { year: "desc" } },
            { academicYear: { semester: "desc" } },
            { assessmentRound: "desc" },
            { createdAt: "desc" },
        ],
        take: 10,
    });
    const latestPhqId = rows[0]?.id;
    return rows.map((row) => ({
        id: row.id,
        academicYearId: row.academicYearId,
        academicYearLabel: `${row.academicYear.year}/${row.academicYear.semester}`,
        isLatestTerm: row.id === latestPhqId,
        assessmentRound: row.assessmentRound,
        q1: row.q1,
        q2: row.q2,
        q3: row.q3,
        q4: row.q4,
        q5: row.q5,
        q6: row.q6,
        q7: row.q7,
        q8: row.q8,
        q9: row.q9,
        q9a: row.q9a,
        q9b: row.q9b,
        totalScore: row.totalScore,
        riskLevel: row.riskLevel,
        referredToHospital: row.referredToHospital,
        hospitalName: row.hospitalName,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    }));
}

async function getActivitySummaries(studentId: string) {
    const rows = await prisma.activityProgress.findMany({
        where: { studentId },
        select: {
            id: true,
            phqResultId: true,
            activityNumber: true,
            status: true,
            scheduledDate: true,
            completedAt: true,
            teacherId: true,
            teacherNotes: true,
            internalProblems: true,
            externalProblems: true,
            problemType: true,
            updatedAt: true,
            teacher: { select: { teacher: { select: { firstName: true, lastName: true } } } },
            phqResult: {
                select: {
                    assessmentRound: true,
                    createdAt: true,
                    academicYear: { select: { year: true, semester: true } },
                },
            },
        },
        orderBy: [
            { phqResult: { createdAt: "desc" } },
            { activityNumber: "asc" },
        ],
        take: 20,
    });
    return rows.map((row) => ({
        id: row.id,
        phqResultId: row.phqResultId,
        academicYearLabel: `${row.phqResult.academicYear.year}/${row.phqResult.academicYear.semester}`,
        assessmentRound: row.phqResult.assessmentRound,
        activityNumber: row.activityNumber,
        status: row.status,
        scheduledDate: row.scheduledDate,
        completedAt: row.completedAt,
        teacherId: row.teacherId,
        teacherName: row.teacher?.teacher
            ? formatTeacherName(row.teacher.teacher)
            : null,
        teacherNotes: row.teacherNotes,
        internalProblems: row.internalProblems,
        externalProblems: row.externalProblems,
        problemType: row.problemType,
        updatedAt: row.updatedAt,
    }));
}

async function getTeacherOptions(schoolId: string) {
    const rows = await prisma.teacher.findMany({
        where: {
            user: {
                schoolId,
                deletedAt: null,
            },
        },
        select: {
            userId: true,
            firstName: true,
            lastName: true,
            advisoryClass: true,
            user: { select: { role: true } },
        },
        orderBy: [{ advisoryClass: "asc" }, { firstName: "asc" }],
        take: 100,
    });
    return rows.map((row) => ({
        userId: row.userId,
        name: formatTeacherName(row) ?? "-",
        role: row.user.role,
        advisoryClass: row.advisoryClass,
    }));
}

async function getCounselingRecords(studentId: string) {
    const rows = await prisma.counselingSession.findMany({
        where: { studentId, deletedAt: null },
        select: COUNSELING_SELECT,
        orderBy: { sessionNumber: "asc" },
        take: 20,
    });
    return rows.map(toCounselingRecord);
}

async function getHomeVisitRecords(studentId: string) {
    const rows = await prisma.homeVisit.findMany({
        where: { studentId, deletedAt: null },
        select: HOME_VISIT_SELECT,
        orderBy: { visitNumber: "desc" },
        take: 20,
    });
    return rows.map(toHomeVisitRecord);
}

function formatTeacherName(
    teacher: { firstName: string; lastName: string } | null,
): string | null {
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : null;
}
