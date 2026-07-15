import type { Prisma } from "@prisma/client";
import { STALE_PREVIEW_MESSAGE } from "./types";

export interface StudentPermanentDeleteTarget {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    schoolId: string;
    schoolName: string;
    class: string;
    status: string;
    disabledAt: Date | null;
    isTestData: boolean;
    updatedAt: Date;
}

export interface SchoolPermanentDeleteTarget {
    id: string;
    name: string;
    province: string | null;
    disabledAt: Date | null;
    isTestData: boolean;
    updatedAt: Date;
}

export function validateStudentPermanentDeleteTarget(
    target: StudentPermanentDeleteTarget,
    expectedUpdatedAt: Date,
): { success: false; message: string } | null {
    if (!target.disabledAt) {
        return { success: false, message: "ต้องปิดใช้งานนักเรียนก่อนลบถาวร" };
    }
    if (target.isTestData) {
        return {
            success: false,
            message: "ต้องยกเลิกการตั้งนักเรียนเป็นข้อมูลทดสอบก่อนลบถาวร",
        };
    }
    if (!isSameTimestamp(target.updatedAt, expectedUpdatedAt)) {
        return { success: false, message: STALE_PREVIEW_MESSAGE };
    }
    return null;
}

export function validateSchoolPermanentDeleteTarget(
    target: SchoolPermanentDeleteTarget,
    expectedUpdatedAt: Date,
): { success: false; message: string } | null {
    if (!target.disabledAt) {
        return { success: false, message: "ต้องปิดใช้งานโรงเรียนก่อนลบถาวร" };
    }
    if (target.isTestData) {
        return {
            success: false,
            message: "ต้องยกเลิกการตั้งโรงเรียนเป็นข้อมูลทดสอบก่อนลบถาวร",
        };
    }
    if (!isSameTimestamp(target.updatedAt, expectedUpdatedAt)) {
        return { success: false, message: STALE_PREVIEW_MESSAGE };
    }
    return null;
}

export function studentTargetSnapshot(
    student: StudentPermanentDeleteTarget,
): Prisma.InputJsonObject {
    return {
        id: student.id,
        label: student.firstName + " " + student.lastName + " (" + student.studentId + ")",
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        schoolId: student.schoolId,
        schoolName: student.schoolName,
        class: student.class,
        status: student.status,
        disabledAt: student.disabledAt?.toISOString() ?? null,
        isTestData: student.isTestData,
        updatedAt: student.updatedAt.toISOString(),
    };
}

export function schoolTargetSnapshot(
    school: SchoolPermanentDeleteTarget,
): Prisma.InputJsonObject {
    return {
        id: school.id,
        label: school.name,
        name: school.name,
        province: school.province,
        disabledAt: school.disabledAt?.toISOString() ?? null,
        isTestData: school.isTestData,
        updatedAt: school.updatedAt.toISOString(),
    };
}

export function isTransactionConflict(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034"
    );
}

function isSameTimestamp(left: Date, right: Date): boolean {
    return Number.isFinite(right.getTime()) && left.getTime() === right.getTime();
}
