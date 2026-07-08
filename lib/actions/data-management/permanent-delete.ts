import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import {
    DATA_MANAGEMENT_PATH,
    createActorSnapshot,
    impactToJsonObject,
} from "./helpers";
import { deleteFilesByUrl } from "./file-storage";
import { getSchoolImpact, getStudentImpact } from "./preview";
import type { DataManagementResponse } from "./types";
import { revalidatePath } from "next/cache";

interface Actor {
    id: string;
    email?: string | null;
    name?: string | null;
    role: string;
}

interface DeleteInput {
    id: string;
    reason: string;
    actor: Actor;
}

interface DeleteResult extends DataManagementResponse {
    eventId?: string;
    fileUrls?: string[];
    schoolId?: string;
}

type Tx = Prisma.TransactionClient;

export async function permanentlyDeleteStudent(
    input: DeleteInput,
): Promise<DataManagementResponse> {
    const result = await prisma.$transaction(async (tx) => {
        const student = await tx.student.findUnique({
            where: { id: input.id },
            include: { school: { select: { id: true, name: true } } },
        });
        if (!student) return failure("ไม่พบนักเรียน");

        const [impact, fileUrls] = await Promise.all([
            getStudentImpact(student.id),
            getStudentFileUrls(student.id),
        ]);
        const event = await tx.dataManagementEvent.create({
            data: {
                targetType: "student",
                targetId: student.id,
                action: "PERMANENT_DELETE",
                reason: input.reason,
                actorUserId: input.actor.id,
                actorSnapshot: createActorSnapshot(input.actor),
                targetSnapshot: {
                    id: student.id,
                    label: `${student.firstName} ${student.lastName} (${student.studentId})`,
                    studentId: student.studentId,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    schoolId: student.schoolId,
                    schoolName: student.school.name,
                },
                impactSnapshot: impactToJsonObject(impact),
            },
            select: { id: true },
        });

        await tx.student.delete({ where: { id: student.id } });
        return {
            success: true,
            message: "ลบถาวรนักเรียนสำเร็จ",
            eventId: event.id,
            fileUrls,
            schoolId: student.schoolId,
        } satisfies DeleteResult;
    });

    if (!result.success) {
        return { success: false, message: result.message };
    }
    if (result.success && result.eventId && result.fileUrls) {
        await recordFileWarnings(result.eventId, result.fileUrls);
    }
    revalidateStudentsCache(result.schoolId, input.id);
    await revalidateAnalyticsCache(result.schoolId);
    revalidatePath(DATA_MANAGEMENT_PATH);
    return { success: result.success, message: result.message };
}

export async function permanentlyDeleteSchool(
    input: DeleteInput,
): Promise<DataManagementResponse> {
    const result = await prisma.$transaction(async (tx) => {
        const school = await tx.school.findUnique({
            where: { id: input.id },
            select: { id: true, name: true, province: true },
        });
        if (!school) return failure("ไม่พบโรงเรียน");

        const systemAdminCount = await tx.user.count({
            where: { schoolId: school.id, role: "system_admin" },
        });
        if (systemAdminCount > 0) {
            return failure("ไม่สามารถลบโรงเรียนที่มี System Admin ผูกอยู่");
        }

        const [impact, fileUrls, userIds] = await Promise.all([
            getSchoolImpact(school.id),
            getSchoolFileUrls(school.id),
            getSchoolUserIds(tx, school.id),
        ]);
        await deleteSchoolDependents(tx, school.id, userIds);
        await assertNoUserReferences(tx, userIds);

        const event = await tx.dataManagementEvent.create({
            data: {
                targetType: "school",
                targetId: school.id,
                action: "PERMANENT_DELETE",
                reason: input.reason,
                actorUserId: input.actor.id,
                actorSnapshot: createActorSnapshot(input.actor),
                targetSnapshot: {
                    id: school.id,
                    label: school.name,
                    name: school.name,
                    province: school.province,
                },
                impactSnapshot: impactToJsonObject(impact),
            },
            select: { id: true },
        });

        await tx.user.deleteMany({ where: { id: { in: userIds } } });
        await tx.school.delete({ where: { id: school.id } });
        return {
            success: true,
            message: "ลบถาวรโรงเรียนสำเร็จ",
            eventId: event.id,
            fileUrls,
            schoolId: school.id,
        } satisfies DeleteResult;
    });

    if (!result.success) {
        return { success: false, message: result.message };
    }
    if (result.success && result.eventId && result.fileUrls) {
        await recordFileWarnings(result.eventId, result.fileUrls);
    }
    revalidateDashboardCache();
    revalidateStudentsCache(result.schoolId);
    await revalidateAnalyticsCache(result.schoolId);
    revalidatePath(DATA_MANAGEMENT_PATH);
    revalidatePath("/admin/users");
    return { success: result.success, message: result.message };
}

async function deleteSchoolDependents(
    tx: Tx,
    schoolId: string,
    userIds: string[],
): Promise<void> {
    await tx.teacherInvite.deleteMany({
        where: { OR: [{ schoolId }, { invitedById: { in: userIds } }] },
    });
    await tx.schoolAdminInvite.deleteMany({
        where: { createdBy: { in: userIds } },
    });
    await tx.student.deleteMany({ where: { schoolId } });
    await tx.schoolTeacherRoster.deleteMany({ where: { schoolId } });
    await tx.schoolClass.deleteMany({ where: { schoolId } });
}

async function assertNoUserReferences(tx: Tx, userIds: string[]): Promise<void> {
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
        throw new Error("ยังมีข้อมูลที่อ้างถึงผู้ใช้ของโรงเรียนนี้ ควรตรวจสอบก่อนลบถาวร");
    }
}

async function getSchoolUserIds(tx: Tx, schoolId: string): Promise<string[]> {
    const users = await tx.user.findMany({ where: { schoolId }, select: { id: true } });
    return users.map((user) => user.id);
}

async function getStudentFileUrls(studentId: string): Promise<string[]> {
    const [worksheets, photos] = await Promise.all([
        prisma.worksheetUpload.findMany({
            where: { activityProgress: { studentId } },
            select: { fileUrl: true },
        }),
        prisma.homeVisitPhoto.findMany({
            where: { homeVisit: { studentId } },
            select: { fileUrl: true },
        }),
    ]);
    return [...worksheets, ...photos].map((file) => file.fileUrl);
}

async function getSchoolFileUrls(schoolId: string): Promise<string[]> {
    const [worksheets, photos] = await Promise.all([
        prisma.worksheetUpload.findMany({
            where: { activityProgress: { student: { schoolId } } },
            select: { fileUrl: true },
        }),
        prisma.homeVisitPhoto.findMany({
            where: { homeVisit: { student: { schoolId } } },
            select: { fileUrl: true },
        }),
    ]);
    return [...worksheets, ...photos].map((file) => file.fileUrl);
}

async function recordFileWarnings(
    eventId: string,
    fileUrls: string[],
): Promise<void> {
    const warnings = await deleteFilesByUrl(fileUrls);
    if (warnings.length === 0) return;
    await prisma.dataManagementEvent.update({
        where: { id: eventId },
        data: { warnings },
    });
}

function failure(message: string): DeleteResult {
    return { success: false, message };
}
