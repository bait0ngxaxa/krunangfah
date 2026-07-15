import { prisma } from "@/lib/database/prisma";
import {
    impactToJsonObject,
} from "./helpers";
import { invalidateUserSessionCaches } from "@/lib/auth/session-store";
import {
    createEvent,
    failure,
    getSchoolForUpdate,
    getSchoolUserIds,
    getStudentForUpdate,
    notFound,
    revalidateAfterSchool,
    revalidateAfterStudent,
    schoolSnapshot,
    studentSnapshot,
    success,
} from "./mutation-helpers";
import { getSchoolImpact, getStudentImpact } from "./preview";
import type { DataManagementResponse } from "./types";
import type { MutationInput } from "./mutation-helpers";

export async function markSchoolAsTestData(
    input: MutationInput,
): Promise<DataManagementResponse> {
    return updateSchoolTestState(input, true);
}

export async function unmarkSchoolTestData(
    input: MutationInput,
): Promise<DataManagementResponse> {
    return updateSchoolTestState(input, false);
}

export async function disableSchool(
    input: MutationInput,
): Promise<DataManagementResponse> {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
        const school = await getSchoolForUpdate(tx, input.id);
        if (!school) return notFound("ไม่พบโรงเรียน");
        if (school.disabledAt) return failure("โรงเรียนนี้ถูกปิดใช้งานอยู่แล้ว");
        if (school.isTestData) {
            return failure("ไม่สามารถปิดใช้งานโรงเรียนที่เป็นข้อมูลทดสอบได้");
        }

        const impact = await getSchoolImpact(tx, input.id);
        const userIds = await getSchoolUserIds(tx, input.id);
        await tx.teacherInvite.deleteMany({
            where: { schoolId: input.id, acceptedAt: null },
        });
        if (userIds.length > 0) {
            await tx.schoolAdminInvite.deleteMany({
                where: { createdBy: { in: userIds }, usedAt: null },
            });
        }
        await tx.school.update({
            where: { id: input.id },
            data: {
                disabledAt: now,
                disabledById: input.actor.id,
                disabledReason: input.reason,
                restoredAt: null,
                restoredById: null,
                restoreReason: null,
            },
        });
        await createEvent(tx, {
            input,
            targetType: "school",
            action: "DISABLE",
            targetId: school.id,
            targetSnapshot: schoolSnapshot(school),
            impactSnapshot: impactToJsonObject(impact),
        });
        return {
            ...success("ปิดใช้งานโรงเรียนสำเร็จ"),
            userIds,
        };
    });

    if (result.success && "userIds" in result && Array.isArray(result.userIds)) {
        await Promise.all(result.userIds.map((userId) => invalidateUserSessionCaches(userId)));
    }
    if (result.success) {
        await revalidateAfterSchool(input.id);
    }
    return { success: result.success, message: result.message };
}

export async function restoreSchool(
    input: MutationInput,
): Promise<DataManagementResponse> {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
        const school = await getSchoolForUpdate(tx, input.id);
        if (!school) return notFound("ไม่พบโรงเรียน");
        if (!school.disabledAt) return failure("โรงเรียนนี้ใช้งานอยู่แล้ว");

        const impact = await getSchoolImpact(tx, input.id);
        await tx.school.update({
            where: { id: input.id },
            data: {
                disabledAt: null,
                disabledById: null,
                disabledReason: null,
                restoredAt: now,
                restoredById: input.actor.id,
                restoreReason: input.reason,
            },
        });
        await createEvent(tx, {
            input,
            targetType: "school",
            action: "RESTORE",
            targetId: school.id,
            targetSnapshot: schoolSnapshot(school),
            impactSnapshot: impactToJsonObject(impact),
        });
        return success("กู้คืนโรงเรียนสำเร็จ");
    });

    if (result.success) {
        await revalidateAfterSchool(input.id);
    }
    return result;
}

export async function disableStudent(
    input: MutationInput,
): Promise<DataManagementResponse> {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
        const student = await getStudentForUpdate(tx, input.id);
        if (!student) return notFound("ไม่พบนักเรียน");
        if (student.disabledAt) return failure("นักเรียนนี้ถูกปิดใช้งานอยู่แล้ว");
        if (student.isTestData) {
            return failure("ไม่สามารถปิดใช้งานนักเรียนที่เป็นข้อมูลทดสอบได้");
        }

        const impact = await getStudentImpact(tx, input.id);
        await tx.student.update({
            where: { id: input.id },
            data: {
                disabledAt: now,
                disabledById: input.actor.id,
                disabledReason: input.reason,
                restoredAt: null,
                restoredById: null,
                restoreReason: null,
            },
        });
        await createEvent(tx, {
            input,
            targetType: "student",
            action: "DISABLE",
            targetId: student.id,
            targetSnapshot: studentSnapshot(student),
            impactSnapshot: impactToJsonObject(impact),
        });
        return success("ปิดใช้งานนักเรียนสำเร็จ");
    });

    if (result.success) {
        await revalidateAfterStudent(input.id);
    }
    return result;
}

export async function restoreStudent(
    input: MutationInput,
): Promise<DataManagementResponse> {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
        const student = await getStudentForUpdate(tx, input.id);
        if (!student) return notFound("ไม่พบนักเรียน");
        if (!student.disabledAt) return failure("นักเรียนนี้ใช้งานอยู่แล้ว");

        const impact = await getStudentImpact(tx, input.id);
        await tx.student.update({
            where: { id: input.id },
            data: {
                disabledAt: null,
                disabledById: null,
                disabledReason: null,
                restoredAt: now,
                restoredById: input.actor.id,
                restoreReason: input.reason,
            },
        });
        await createEvent(tx, {
            input,
            targetType: "student",
            action: "RESTORE",
            targetId: student.id,
            targetSnapshot: studentSnapshot(student),
            impactSnapshot: impactToJsonObject(impact),
        });
        return success("กู้คืนนักเรียนสำเร็จ");
    });

    if (result.success) {
        await revalidateAfterStudent(input.id);
    }
    return result;
}

export async function markStudentAsTestData(
    input: MutationInput,
): Promise<DataManagementResponse> {
    return updateStudentTestState(input, true);
}

export async function unmarkStudentTestData(
    input: MutationInput,
): Promise<DataManagementResponse> {
    return updateStudentTestState(input, false);
}

async function updateSchoolTestState(
    input: MutationInput,
    isTestData: boolean,
): Promise<DataManagementResponse> {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
        const school = await getSchoolForUpdate(tx, input.id);
        if (!school) return notFound("ไม่พบโรงเรียน");
        if (school.isTestData === isTestData) {
            return failure(isTestData ? "โรงเรียนนี้เป็นข้อมูลทดสอบอยู่แล้ว" : "โรงเรียนนี้ไม่ได้เป็นข้อมูลทดสอบ");
        }
        if (isTestData && school.disabledAt) {
            return failure("ต้องเปิดใช้งานโรงเรียนก่อนจึงจะตั้งเป็นข้อมูลทดสอบได้");
        }

        const impact = await getSchoolImpact(tx, input.id);
        await tx.school.update({
            where: { id: input.id },
            data: {
                isTestData,
                testDataMarkedAt: isTestData ? now : null,
                testDataMarkedById: isTestData ? input.actor.id : null,
                testDataReason: isTestData ? input.reason : null,
            },
        });
        await createEvent(tx, {
            input,
            targetType: "school",
            action: isTestData ? "MARK_TEST_DATA" : "UNMARK_TEST_DATA",
            targetId: school.id,
            targetSnapshot: schoolSnapshot(school),
            impactSnapshot: impactToJsonObject(impact),
        });
        return success(isTestData ? "ตั้งเป็นข้อมูลทดสอบสำเร็จ" : "ยกเลิกข้อมูลทดสอบสำเร็จ");
    });

    if (result.success) {
        await revalidateAfterSchool(input.id);
    }
    return result;
}

async function updateStudentTestState(
    input: MutationInput,
    isTestData: boolean,
): Promise<DataManagementResponse> {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
        const student = await getStudentForUpdate(tx, input.id);
        if (!student) return notFound("ไม่พบนักเรียน");
        if (student.isTestData === isTestData) {
            return failure(isTestData ? "นักเรียนนี้เป็นข้อมูลทดสอบอยู่แล้ว" : "นักเรียนนี้ไม่ได้เป็นข้อมูลทดสอบ");
        }
        if (isTestData && student.disabledAt) {
            return failure("ต้องเปิดใช้งานนักเรียนก่อนจึงจะตั้งเป็นข้อมูลทดสอบได้");
        }

        const impact = await getStudentImpact(tx, input.id);
        await tx.student.update({
            where: { id: input.id },
            data: {
                isTestData,
                testDataMarkedAt: isTestData ? now : null,
                testDataMarkedById: isTestData ? input.actor.id : null,
                testDataReason: isTestData ? input.reason : null,
            },
        });
        await createEvent(tx, {
            input,
            targetType: "student",
            action: isTestData ? "MARK_TEST_DATA" : "UNMARK_TEST_DATA",
            targetId: student.id,
            targetSnapshot: studentSnapshot(student),
            impactSnapshot: impactToJsonObject(impact),
        });
        return success(isTestData ? "ตั้งเป็นข้อมูลทดสอบสำเร็จ" : "ยกเลิกข้อมูลทดสอบสำเร็จ");
    });

    if (result.success) {
        await revalidateAfterStudent(input.id);
    }
    return result;
}
