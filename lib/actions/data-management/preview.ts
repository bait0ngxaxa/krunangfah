import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { createEmptyImpact, listRecentEvents } from "./helpers";
import { getSchoolFileUrls, getStudentFileUrls } from "./permanent-delete-dependents";
import { createPermanentDeleteImpactFingerprint } from "./permanent-delete-fingerprint";
import type {
    ImpactSummary,
    SchoolDataManagementPreview,
    StudentDataManagementPreview,
} from "./types";

export type DataManagementDb = typeof prisma | Prisma.TransactionClient;

export async function getSchoolDataManagementPreview(
    schoolId: string,
): Promise<SchoolDataManagementPreview | null> {
    const snapshot = await prisma.$transaction(async (tx) => {
        const school = await tx.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                province: true,
                disabledAt: true,
                updatedAt: true,
                disabledReason: true,
                isTestData: true,
                testDataReason: true,
            },
        });
        if (!school) return null;
        const [impact, fileUrls] = await Promise.all([
            getSchoolImpact(tx, school.id),
            getSchoolFileUrls(tx, school.id),
        ]);
        return {
            ...school,
            impact,
            impactFingerprint: createPermanentDeleteImpactFingerprint({
                targetId: school.id,
                targetUpdatedAt: school.updatedAt,
                impact,
                fileUrls,
            }),
        };
    });
    if (!snapshot) return null;
    const recentEvents = await listRecentEvents("school", snapshot.id);
    return { type: "school", ...snapshot, recentEvents };
}

export async function getStudentDataManagementPreview(
    studentId: string,
): Promise<StudentDataManagementPreview | null> {
    const snapshot = await prisma.$transaction(async (tx) => {
        const student = await tx.student.findUnique({
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
                updatedAt: true,
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
        const [impact, fileUrls] = await Promise.all([
            getStudentImpact(tx, student.id),
            getStudentFileUrls(tx, student.id),
        ]);
        return {
            ...student,
            impact,
            impactFingerprint: createPermanentDeleteImpactFingerprint({
                targetId: student.id,
                targetUpdatedAt: student.updatedAt,
                impact,
                fileUrls,
            }),
        };
    });
    if (!snapshot) return null;
    const recentEvents = await listRecentEvents("student", snapshot.id);
    return { type: "student", ...snapshot, recentEvents };
}

export async function getSchoolImpact(
    db: DataManagementDb,
    schoolId: string,
): Promise<ImpactSummary> {
    const users = await db.user.findMany({
        where: { schoolId },
        select: { id: true },
    });
    const schoolUserIds = users.map((user) => user.id);
    const now = new Date();

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
        studentReferralCount,
        pendingTeacherInviteCount,
        pendingSchoolAdminInviteCount,
    ] = await Promise.all([
        db.user.count({ where: { schoolId } }),
        db.student.count({ where: { schoolId } }),
        db.student.count({
            where: { schoolId, disabledAt: null, status: "ACTIVE" },
        }),
        db.phqResult.count({ where: { student: { schoolId } } }),
        db.activityProgress.count({ where: { student: { schoolId } } }),
        db.counselingSession.count({ where: { student: { schoolId } } }),
        db.homeVisit.count({ where: { student: { schoolId } } }),
        db.worksheetUpload.count({
            where: { activityProgress: { student: { schoolId } } },
        }),
        db.homeVisitPhoto.count({
            where: { homeVisit: { student: { schoolId } } },
        }),
        db.studentReferral.count({ where: { student: { schoolId } } }),
        db.teacherInvite.count({
            where: { schoolId, acceptedAt: null, expiresAt: { gt: now } },
        }),
        schoolUserIds.length === 0
            ? Promise.resolve(0)
            : db.schoolAdminInvite.count({
                  where: {
                      createdBy: { in: schoolUserIds },
                      usedAt: null,
                      expiresAt: { gt: now },
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
        studentReferralCount,
        pendingTeacherInviteCount,
        pendingSchoolAdminInviteCount,
        fileCount: worksheetUploadCount + homeVisitPhotoCount,
    };
}

export async function getStudentImpact(
    db: DataManagementDb,
    studentId: string,
): Promise<ImpactSummary> {
    const [
        phqResultCount,
        activityProgressCount,
        counselingSessionCount,
        homeVisitCount,
        worksheetUploadCount,
        homeVisitPhotoCount,
        studentReferralCount,
    ] = await Promise.all([
        db.phqResult.count({ where: { studentId } }),
        db.activityProgress.count({ where: { studentId } }),
        db.counselingSession.count({ where: { studentId } }),
        db.homeVisit.count({ where: { studentId } }),
        db.worksheetUpload.count({
            where: { activityProgress: { studentId } },
        }),
        db.homeVisitPhoto.count({ where: { homeVisit: { studentId } } }),
        db.studentReferral.count({ where: { studentId } }),
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
        studentReferralCount,
        fileCount: worksheetUploadCount + homeVisitPhotoCount,
    };
}
