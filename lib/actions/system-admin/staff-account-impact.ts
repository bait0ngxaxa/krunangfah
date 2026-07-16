import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

interface StaffAccountTargetForImpact {
    id: string;
    email: string;
    name: string | null;
    role: string;
    schoolId: string | null;
}

export interface StaffDeleteImpactCounts {
    studentCount: number;
    phqResultCount: number;
    activityProgressCount: number;
    worksheetUploadCount: number;
    counselingSessionCount: number;
    homeVisitCount: number;
    studentReferralCount: number;
    sessionCount: number;
    teacherInviteCount: number;
    schoolAdminInviteCount: number;
    passwordResetTokenCount: number;
    schoolTeacherRosterCount: number;
    teacherProfileCount: number;
    fileCount: number;
}

export interface StaffDeleteImpact {
    userId: string;
    schoolId: string | null;
    studentIds: string[];
    fileUrls: string[];
    counts: StaffDeleteImpactCounts;
}

export async function preserveCareHistoryAndDeleteAccountData(
    tx: Tx,
    target: StaffAccountTargetForImpact,
): Promise<StaffDeleteImpact> {
    const rows = await findStaffImpactRows(tx, target.id);
    const studentIds = getImpactedStudentIds(rows);
    const actorSnapshot = createStaffSnapshot(target);
    const updates = await preserveCareHistory(tx, target.id, actorSnapshot);
    const cleanup = await deleteStaffAccountData(tx, target);
    const teacherProfile = await tx.teacher.deleteMany({
        where: { userId: target.id },
    });

    return {
        userId: target.id,
        schoolId: target.schoolId,
        studentIds,
        fileUrls: [],
        counts: {
            studentCount: studentIds.length,
            phqResultCount: updates.phqResultCount,
            activityProgressCount: updates.activityProgressCount,
            worksheetUploadCount: updates.worksheetUploadCount,
            counselingSessionCount: updates.counselingSessionCount,
            homeVisitCount: updates.homeVisitCount,
            studentReferralCount: cleanup.studentReferralCount,
            sessionCount: cleanup.sessionCount,
            teacherInviteCount: cleanup.teacherInviteCount,
            schoolAdminInviteCount: cleanup.schoolAdminInviteCount,
            passwordResetTokenCount: cleanup.passwordResetTokenCount,
            schoolTeacherRosterCount: cleanup.schoolTeacherRosterCount,
            teacherProfileCount: teacherProfile.count,
            fileCount: 0,
        },
    };
}

interface StaffImpactRows {
    phqRows: Array<{ studentId: string }>;
    activityRows: Array<{ studentId: string }>;
    worksheetRows: Array<{ activityProgress: { studentId: string } }>;
    counselingRows: Array<{ studentId: string }>;
    homeVisitRows: Array<{ studentId: string }>;
    referralRows: Array<{ studentId: string }>;
}

async function findStaffImpactRows(
    tx: Tx,
    userId: string,
): Promise<StaffImpactRows> {
    const referralWhere = {
        OR: [{ fromTeacherUserId: userId }, { toTeacherUserId: userId }],
    };
    const [phqRows, activityRows, worksheetRows, counselingRows, homeVisitRows, referralRows] =
        await Promise.all([
            tx.phqResult.findMany({
                where: { importedById: userId },
                select: { studentId: true },
            }),
            tx.activityProgress.findMany({
                where: { teacherId: userId },
                select: { studentId: true },
            }),
            tx.worksheetUpload.findMany({
                where: { uploadedById: userId },
                select: { activityProgress: { select: { studentId: true } } },
            }),
            tx.counselingSession.findMany({
                where: { createdById: userId },
                select: { studentId: true },
            }),
            tx.homeVisit.findMany({
                where: { createdById: userId },
                select: { studentId: true },
            }),
            tx.studentReferral.findMany({
                where: referralWhere,
                select: { studentId: true },
            }),
        ]);
    return {
        phqRows,
        activityRows,
        worksheetRows,
        counselingRows,
        homeVisitRows,
        referralRows,
    };
}

function getImpactedStudentIds(rows: StaffImpactRows): string[] {
    const directIds = [
        rows.phqRows,
        rows.activityRows,
        rows.counselingRows,
        rows.homeVisitRows,
        rows.referralRows,
    ].flatMap((items) => items.map((item) => item.studentId));
    const worksheetIds = rows.worksheetRows.map(
        (row) => row.activityProgress.studentId,
    );
    return [...new Set([...directIds, ...worksheetIds])];
}

async function preserveCareHistory(
    tx: Tx,
    userId: string,
    actorSnapshot: Prisma.InputJsonObject,
): Promise<{
    phqResultCount: number;
    activityProgressCount: number;
    worksheetUploadCount: number;
    counselingSessionCount: number;
    homeVisitCount: number;
}> {
    const [activity, phq, worksheet, counseling, homeVisit] = await Promise.all([
        tx.activityProgress.updateMany({
            where: { teacherId: userId },
            data: { teacherId: null, teacherSnapshot: actorSnapshot },
        }),
        tx.phqResult.updateMany({
            where: { importedById: userId },
            data: { importedById: null, importedBySnapshot: actorSnapshot },
        }),
        tx.worksheetUpload.updateMany({
            where: { uploadedById: userId },
            data: { uploadedById: null, uploadedBySnapshot: actorSnapshot },
        }),
        tx.counselingSession.updateMany({
            where: { createdById: userId },
            data: { createdById: null, createdBySnapshot: actorSnapshot },
        }),
        tx.homeVisit.updateMany({
            where: { createdById: userId },
            data: { createdById: null, createdBySnapshot: actorSnapshot },
        }),
    ]);
    return {
        phqResultCount: phq.count,
        activityProgressCount: activity.count,
        worksheetUploadCount: worksheet.count,
        counselingSessionCount: counseling.count,
        homeVisitCount: homeVisit.count,
    };
}

interface StaffAccountCleanupCounts {
    sessionCount: number;
    teacherInviteCount: number;
    schoolAdminInviteCount: number;
    passwordResetTokenCount: number;
    schoolTeacherRosterCount: number;
    studentReferralCount: number;
}

async function deleteStaffAccountData(
    tx: Tx,
    target: StaffAccountTargetForImpact,
): Promise<StaffAccountCleanupCounts> {
    const [invites, sessions, resetTokens, roster, referrals] = await Promise.all([
        deleteStaffInvites(tx, target),
        tx.userSession.deleteMany({ where: { userId: target.id } }),
        tx.passwordResetToken.deleteMany({ where: { email: target.email } }),
        tx.schoolTeacherRoster.deleteMany({ where: { email: target.email } }),
        tx.studentReferral.deleteMany({
            where: {
                OR: [
                    { fromTeacherUserId: target.id },
                    { toTeacherUserId: target.id },
                ],
            },
        }),
    ]);
    return {
        sessionCount: sessions.count,
        teacherInviteCount: invites.teacherInviteCount,
        schoolAdminInviteCount: invites.schoolAdminInviteCount,
        passwordResetTokenCount: resetTokens.count,
        schoolTeacherRosterCount: roster.count,
        studentReferralCount: referrals.count,
    };
}

async function deleteStaffInvites(
    tx: Tx,
    target: StaffAccountTargetForImpact,
): Promise<{ teacherInviteCount: number; schoolAdminInviteCount: number }> {
    const [teacherInvites, schoolAdminInvites] = await Promise.all([
        tx.teacherInvite.deleteMany({
            where: {
                OR: [{ invitedById: target.id }, { email: target.email }],
            },
        }),
        tx.schoolAdminInvite.deleteMany({
            where: {
                OR: [{ createdBy: target.id }, { email: target.email }],
            },
        }),
    ]);
    return {
        teacherInviteCount: teacherInvites.count,
        schoolAdminInviteCount: schoolAdminInvites.count,
    };
}

function createStaffSnapshot(
    target: StaffAccountTargetForImpact,
): Prisma.InputJsonObject {
    return {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
    };
}
