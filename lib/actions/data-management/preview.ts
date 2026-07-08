import { prisma } from "@/lib/database/prisma";
import {
    createEmptyImpact,
    listRecentEvents,
} from "./helpers";
import type {
    ImpactSummary,
    SchoolDataManagementPreview,
    StudentDataManagementPreview,
} from "./types";

export async function getSchoolDataManagementPreview(
    schoolId: string,
): Promise<SchoolDataManagementPreview | null> {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: {
            id: true,
            name: true,
            province: true,
            disabledAt: true,
            disabledReason: true,
            isTestData: true,
            testDataReason: true,
        },
    });
    if (!school) return null;

    const [impact, recentEvents] = await Promise.all([
        getSchoolImpact(school.id),
        listRecentEvents("school", school.id),
    ]);

    return { type: "school", ...school, impact, recentEvents };
}

export async function getStudentDataManagementPreview(
    studentId: string,
): Promise<StudentDataManagementPreview | null> {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            class: true,
            status: true,
            disabledAt: true,
            disabledReason: true,
            isTestData: true,
            testDataReason: true,
            school: {
                select: {
                    id: true,
                    name: true,
                    disabledAt: true,
                    isTestData: true,
                },
            },
        },
    });
    if (!student) return null;

    const [impact, recentEvents] = await Promise.all([
        getStudentImpact(student.id),
        listRecentEvents("student", student.id),
    ]);

    return { type: "student", ...student, impact, recentEvents };
}

export async function getSchoolImpact(schoolId: string): Promise<ImpactSummary> {
    const userIds = await prisma.user.findMany({
        where: { schoolId },
        select: { id: true },
    });
    const schoolUserIds = userIds.map((user) => user.id);

    const [
        userCount,
        studentCount,
        activeStudentCount,
        phqResultCount,
        activityProgressCount,
        counselingSessionCount,
        homeVisitCount,
        worksheetUploadCount,
        homeVisitPhotoCount,
        pendingTeacherInviteCount,
        pendingSchoolAdminInviteCount,
    ] = await Promise.all([
        prisma.user.count({ where: { schoolId } }),
        prisma.student.count({ where: { schoolId } }),
        prisma.student.count({ where: { schoolId, disabledAt: null, status: "ACTIVE" } }),
        prisma.phqResult.count({ where: { student: { schoolId } } }),
        prisma.activityProgress.count({ where: { student: { schoolId } } }),
        prisma.counselingSession.count({ where: { student: { schoolId } } }),
        prisma.homeVisit.count({ where: { student: { schoolId } } }),
        prisma.worksheetUpload.count({
            where: { activityProgress: { student: { schoolId } } },
        }),
        prisma.homeVisitPhoto.count({
            where: { homeVisit: { student: { schoolId } } },
        }),
        prisma.teacherInvite.count({
            where: { schoolId, acceptedAt: null, expiresAt: { gt: new Date() } },
        }),
        schoolUserIds.length === 0
            ? Promise.resolve(0)
            : prisma.schoolAdminInvite.count({
                  where: {
                      createdBy: { in: schoolUserIds },
                      usedAt: null,
                      expiresAt: { gt: new Date() },
                  },
              }),
    ]);

    return {
        ...createEmptyImpact(),
        userCount,
        studentCount,
        activeStudentCount,
        phqResultCount,
        activityProgressCount,
        counselingSessionCount,
        homeVisitCount,
        worksheetUploadCount,
        homeVisitPhotoCount,
        pendingTeacherInviteCount,
        pendingSchoolAdminInviteCount,
        fileCount: worksheetUploadCount + homeVisitPhotoCount,
    };
}

export async function getStudentImpact(studentId: string): Promise<ImpactSummary> {
    const [
        phqResultCount,
        activityProgressCount,
        counselingSessionCount,
        homeVisitCount,
        worksheetUploadCount,
        homeVisitPhotoCount,
    ] = await Promise.all([
        prisma.phqResult.count({ where: { studentId } }),
        prisma.activityProgress.count({ where: { studentId } }),
        prisma.counselingSession.count({ where: { studentId } }),
        prisma.homeVisit.count({ where: { studentId } }),
        prisma.worksheetUpload.count({
            where: { activityProgress: { studentId } },
        }),
        prisma.homeVisitPhoto.count({
            where: { homeVisit: { studentId } },
        }),
    ]);

    return {
        ...createEmptyImpact(),
        studentCount: 1,
        phqResultCount,
        activityProgressCount,
        counselingSessionCount,
        homeVisitCount,
        worksheetUploadCount,
        homeVisitPhotoCount,
        fileCount: worksheetUploadCount + homeVisitPhotoCount,
    };
}
