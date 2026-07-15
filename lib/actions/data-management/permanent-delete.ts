import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import { prisma } from "@/lib/database/prisma";
import { logError } from "@/lib/utils/logging";
import {
    DATA_MANAGEMENT_PATH,
    createActorSnapshot,
    impactToJsonObject,
} from "./helpers";
import { deleteFilesByUrl } from "./file-storage";
import {
    getSchoolImpact,
    getStudentImpact,
} from "./preview";
import type { DataManagementResponse } from "./types";
import type { Actor } from "./mutation-helpers";
import { dataManagementPermanentDeleteSchema } from "@/lib/validations/data-management.validation";
import {
    isTransactionConflict,
    schoolTargetSnapshot,
    studentTargetSnapshot,
    validateSchoolPermanentDeleteTarget,
    validateStudentPermanentDeleteTarget,
} from "./permanent-delete-guards";
import type {
    SchoolPermanentDeleteTarget,
    StudentPermanentDeleteTarget,
} from "./permanent-delete-guards";
import {
    assertNoUserReferences,
    deleteSchoolDependents,
    deleteStudentDependents,
    getSchoolFileUrls,
    getSchoolUsers,
    getStudentFileUrls,
    UserReferencesRemainError,
} from "./permanent-delete-dependents";

type Tx = Prisma.TransactionClient;

export interface PermanentDeleteInput {
    id: string;
    reason: string;
    expectedUpdatedAt: Date;
    actor: Actor;
}

interface DeleteResult extends DataManagementResponse {
    eventId?: string;
    fileUrls?: string[];
    schoolId?: string;
}

const TRANSACTION_OPTIONS = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
};

export async function permanentlyDeleteStudent(
    input: PermanentDeleteInput,
): Promise<DataManagementResponse> {
    const inputFailure = validatePermanentDeleteInput(input);
    if (inputFailure) return inputFailure;
    if (!isSystemAdmin(input.actor)) return failure("ไม่มีสิทธิ์ดำเนินการลบถาวร");
    const result = await runDeleteTransaction((tx) =>
        deleteStudentInTransaction(tx, input),
    );
    if (!result.success) return result;

    await recordFileWarnings(result.eventId, result.fileUrls);
    revalidateStudentsCache(result.schoolId, input.id);
    await revalidateAnalyticsCache(result.schoolId);
    revalidatePath(DATA_MANAGEMENT_PATH);
    return { success: true, message: result.message };
}

export async function permanentlyDeleteSchool(
    input: PermanentDeleteInput,
): Promise<DataManagementResponse> {
    const inputFailure = validatePermanentDeleteInput(input);
    if (inputFailure) return inputFailure;
    if (!isSystemAdmin(input.actor)) return failure("ไม่มีสิทธิ์ดำเนินการลบถาวร");
    const result = await runDeleteTransaction((tx) =>
        deleteSchoolInTransaction(tx, input),
    );
    if (!result.success) return result;

    await recordFileWarnings(result.eventId, result.fileUrls);
    revalidateDashboardCache();
    revalidateStudentsCache(result.schoolId);
    await revalidateAnalyticsCache(result.schoolId);
    revalidatePath(DATA_MANAGEMENT_PATH);
    revalidatePath("/admin/users");
    return { success: true, message: result.message };
}

async function deleteStudentInTransaction(
    tx: Tx,
    input: PermanentDeleteInput,
): Promise<DeleteResult> {
    const student = await getStudentTarget(tx, input.id);
    if (!student) return failure("ไม่พบนักเรียน");

    const guardFailure = validateStudentPermanentDeleteTarget(
        student,
        input.expectedUpdatedAt,
    );
    if (guardFailure) return guardFailure;

    const [impact, fileUrls] = await Promise.all([
        getStudentImpact(tx, student.id),
        getStudentFileUrls(tx, student.id),
    ]);
    await deleteStudentDependents(tx, student.id);
    const event = await tx.dataManagementEvent.create({
        data: {
            targetType: "student",
            targetId: student.id,
            action: "PERMANENT_DELETE",
            reason: input.reason,
            actorUserId: input.actor.id,
            actorSnapshot: createActorSnapshot(input.actor),
            targetSnapshot: studentTargetSnapshot(student),
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
    };
}

async function deleteSchoolInTransaction(
    tx: Tx,
    input: PermanentDeleteInput,
): Promise<DeleteResult> {
    const school = await getSchoolTarget(tx, input.id);
    if (!school) return failure("ไม่พบโรงเรียน");

    const guardFailure = validateSchoolPermanentDeleteTarget(
        school,
        input.expectedUpdatedAt,
    );
    if (guardFailure) return guardFailure;

    const systemAdminCount = await tx.user.count({
        where: { schoolId: school.id, role: "system_admin" },
    });
    if (systemAdminCount > 0) {
        return failure("ไม่สามารถลบโรงเรียนที่มี System Admin ผูกอยู่");
    }

    const [impact, fileUrls, users] = await Promise.all([
        getSchoolImpact(tx, school.id),
        getSchoolFileUrls(tx, school.id),
        getSchoolUsers(tx, school.id),
    ]);
    const userIds = users.map((user) => user.id);
    await deleteSchoolDependents(tx, school.id, users);
    await assertNoUserReferences(tx, userIds);

    const event = await tx.dataManagementEvent.create({
        data: {
            targetType: "school",
            targetId: school.id,
            action: "PERMANENT_DELETE",
            reason: input.reason,
            actorUserId: input.actor.id,
            actorSnapshot: createActorSnapshot(input.actor),
            targetSnapshot: schoolTargetSnapshot(school),
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
    };
}

async function getStudentTarget(
    tx: Tx,
    id: string,
): Promise<StudentPermanentDeleteTarget | null> {
    return tx.student.findUnique({
        where: { id },
        select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            schoolId: true,
            class: true,
            status: true,
            disabledAt: true,
            isTestData: true,
            updatedAt: true,
            school: { select: { name: true } },
        },
    }).then((student) =>
        student
            ? { ...student, schoolName: student.school.name, status: student.status }
            : null,
    );
}

async function getSchoolTarget(
    tx: Tx,
    id: string,
): Promise<SchoolPermanentDeleteTarget | null> {
    return tx.school.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            province: true,
            disabledAt: true,
            isTestData: true,
            updatedAt: true,
        },
    });
}

async function runDeleteTransaction(
    operation: (tx: Tx) => Promise<DeleteResult>,
): Promise<DeleteResult> {
    try {
        return await prisma.$transaction(operation, TRANSACTION_OPTIONS);
    } catch (error) {
        logError("Permanent data deletion transaction failed:", error);
        if (error instanceof UserReferencesRemainError) {
            return failure(error.message);
        }
        if (isTransactionConflict(error)) {
            return failure("ข้อมูลมีการเปลี่ยนแปลง กรุณาโหลดผลกระทบล่าสุดแล้วลองใหม่");
        }
        return failure("เกิดข้อผิดพลาดในการลบถาวร");
    }
}

async function recordFileWarnings(
    eventId: string | undefined,
    fileUrls: string[] | undefined,
): Promise<void> {
    if (!eventId || !fileUrls) return;
    let warnings: string[];
    try {
        warnings = await deleteFilesByUrl(fileUrls);
    } catch (error) {
        logError("Delete managed files error:", error);
        warnings = ["ลบไฟล์ไม่สำเร็จ"];
    }
    if (warnings.length === 0) return;
    try {
        await prisma.dataManagementEvent.update({
            where: { id: eventId },
            data: { warnings },
        });
    } catch (error) {
        logError("Record managed file warnings error:", error);
    }
}

function isSystemAdmin(actor: Actor): boolean {
    return actor.role === "system_admin";
}

function validatePermanentDeleteInput(
    input: PermanentDeleteInput,
): DataManagementResponse | null {
    const parsed = dataManagementPermanentDeleteSchema.safeParse({
        id: input.id,
        reason: input.reason,
        expectedUpdatedAt: input.expectedUpdatedAt,
    });
    if (parsed.success) return null;
    return failure(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
}

function failure(message: string): DeleteResult {
    return { success: false, message };
}
