import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;
export type SchoolUserForDelete = { id: string; email: string | null };

export class UserReferencesRemainError extends Error {
    constructor() {
        super("ยังมีข้อมูลที่อ้างถึงผู้ใช้ของโรงเรียนนี้ ควรตรวจสอบก่อนลบถาวร");
        this.name = "UserReferencesRemainError";
    }
}

export async function deleteSchoolDependents(
    tx: Tx,
    schoolId: string,
    users: SchoolUserForDelete[],
): Promise<void> {
    const userIds = users.map((user) => user.id);
    const emails = getUserEmails(users);
    await tx.teacherInvite.deleteMany({
        where: { OR: [{ schoolId }, { invitedById: { in: userIds } }] },
    });
    await tx.schoolAdminInvite.deleteMany({
        where: {
            OR: [{ createdBy: { in: userIds } }, { email: { in: emails } }],
        },
    });
    await deleteSchoolStudentDependents(tx, schoolId);
    await tx.student.deleteMany({ where: { schoolId } });
    await tx.schoolTeacherRoster.deleteMany({ where: { schoolId } });
    await tx.schoolClass.deleteMany({ where: { schoolId } });
    await deleteSchoolUserDependents(tx, users);
}

export async function deleteStudentDependents(
    tx: Tx,
    studentId: string,
): Promise<void> {
    await tx.worksheetUpload.deleteMany({
        where: { activityProgress: { studentId } },
    });
    await tx.homeVisitPhoto.deleteMany({
        where: { homeVisit: { studentId } },
    });
    await tx.studentReferral.deleteMany({ where: { studentId } });
    await tx.activityProgress.deleteMany({ where: { studentId } });
    await tx.phqResult.deleteMany({ where: { studentId } });
    await tx.counselingSession.deleteMany({ where: { studentId } });
    await tx.homeVisit.deleteMany({ where: { studentId } });
}

export async function getStudentFileUrls(
    tx: Tx,
    studentId: string,
): Promise<string[]> {
    const [worksheets, photos] = await Promise.all([
        tx.worksheetUpload.findMany({
            where: { activityProgress: { studentId } },
            select: { fileUrl: true },
        }),
        tx.homeVisitPhoto.findMany({
            where: { homeVisit: { studentId } },
            select: { fileUrl: true },
        }),
    ]);
    return [...worksheets, ...photos].map((file) => file.fileUrl);
}

export async function getSchoolFileUrls(
    tx: Tx,
    schoolId: string,
): Promise<string[]> {
    const [worksheets, photos] = await Promise.all([
        tx.worksheetUpload.findMany({
            where: { activityProgress: { student: { schoolId } } },
            select: { fileUrl: true },
        }),
        tx.homeVisitPhoto.findMany({
            where: { homeVisit: { student: { schoolId } } },
            select: { fileUrl: true },
        }),
    ]);
    return [...worksheets, ...photos].map((file) => file.fileUrl);
}

export async function getSchoolUsers(
    tx: Tx,
    schoolId: string,
): Promise<SchoolUserForDelete[]> {
    return tx.user.findMany({
        where: { schoolId },
        select: { id: true, email: true },
    });
}

export async function assertNoUserReferences(
    tx: Tx,
    userIds: string[],
): Promise<void> {
    if (userIds.length === 0) return;
    const checks = await Promise.all([
        tx.phqResult.count({ where: { importedById: { in: userIds } } }),
        tx.activityProgress.count({ where: { teacherId: { in: userIds } } }),
        tx.worksheetUpload.count({ where: { uploadedById: { in: userIds } } }),
        tx.counselingSession.count({ where: { createdById: { in: userIds } } }),
        tx.studentReferral.count({
            where: {
                OR: [
                    { fromTeacherUserId: { in: userIds } },
                    { toTeacherUserId: { in: userIds } },
                ],
            },
        }),
        tx.homeVisit.count({ where: { createdById: { in: userIds } } }),
    ]);

    if (checks.some((count) => count > 0)) {
        throw new UserReferencesRemainError();
    }
}

async function deleteSchoolStudentDependents(
    tx: Tx,
    schoolId: string,
): Promise<void> {
    await tx.worksheetUpload.deleteMany({
        where: { activityProgress: { student: { schoolId } } },
    });
    await tx.homeVisitPhoto.deleteMany({
        where: { homeVisit: { student: { schoolId } } },
    });
    await tx.studentReferral.deleteMany({
        where: { student: { schoolId } },
    });
    await tx.activityProgress.deleteMany({
        where: { student: { schoolId } },
    });
    await tx.phqResult.deleteMany({
        where: { student: { schoolId } },
    });
    await tx.counselingSession.deleteMany({
        where: { student: { schoolId } },
    });
    await tx.homeVisit.deleteMany({
        where: { student: { schoolId } },
    });
}

async function deleteSchoolUserDependents(
    tx: Tx,
    users: SchoolUserForDelete[],
): Promise<void> {
    const userIds = users.map((user) => user.id);
    if (userIds.length === 0) return;
    const emails = getUserEmails(users);
    await tx.userSession.deleteMany({ where: { userId: { in: userIds } } });
    await tx.teacher.deleteMany({ where: { userId: { in: userIds } } });
    if (emails.length > 0) {
        await tx.passwordResetToken.deleteMany({
            where: { email: { in: emails } },
        });
    }
}

function getUserEmails(users: SchoolUserForDelete[]): string[] {
    return users.flatMap(({ email }) => (email ? [email] : []));
}
