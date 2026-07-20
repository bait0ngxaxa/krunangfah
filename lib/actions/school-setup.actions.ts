"use server";

import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import { canManageSchoolClasses } from "@/lib/auth/teacher-management-policy";
import {
    ensureSchoolClassTermsForAcademicYear,
    upsertCurrentSchoolClassTerm,
} from "@/lib/services/school-class-term-service";
import { revalidatePath } from "next/cache";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import { schoolInfoSchema } from "@/lib/validations/school.validation";
import { revalidateDashboardCache } from "./dashboard/cache";
import { revalidateAnalyticsCache } from "./analytics/cache";
import { handleActionError } from "./error-handler";
import type {
    SchoolClassItem,
    SchoolSetupResponse,
    ClassActionResponse,
} from "@/types/school-setup.types";

const CLASSES_PATH = "/school/classes";

/**
 * Re-reads schoolId from DB right after createSchoolAndLink.
 * Falls back to the value in session if present.
 */
async function resolveSchoolId(
    userId: string,
    sessionSchoolId: string | null | undefined,
): Promise<string | null> {
    if (sessionSchoolId) return sessionSchoolId;
    const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { schoolId: true },
    });
    return dbUser?.schoolId ?? null;
}

const classNameSchema = z
    .string()
    .min(1, "กรุณากรอกชื่อห้องเรียน")
    .max(INPUT_LIMITS.school.className, "ชื่อห้องเรียนยาวเกินไป");

const expectedStudentCountSchema = z
    .number()
    .int("จำนวนนักเรียนต้องเป็นจำนวนเต็ม")
    .min(1, "จำนวนนักเรียนต้องมากกว่า 0")
    .max(
        INPUT_LIMITS.school.classStudentCount,
        `จำนวนนักเรียนต้องไม่เกิน ${INPUT_LIMITS.school.classStudentCount} คน`,
    );

class SchoolClaimError extends Error {}

/**
 * สร้างโรงเรียนและผูก schoolId เข้ากับ user ปัจจุบัน (school_admin only)
 */
export async function createSchoolAndLink(input: {
    name: string;
    province?: string;
}): Promise<SchoolSetupResponse> {
    try {
        const session = await requireAuth();

        if (session.user.role !== "school_admin") {
            return {
                success: false,
                message:
                    session.user.role === "system_admin"
                        ? "system_admin ไม่ต้องตั้งค่าโรงเรียน"
                        : "ไม่มีสิทธิ์สร้างโรงเรียน",
            };
        }

        const parsed = schoolInfoSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, message: parsed.error.issues[0].message };
        }

        const school = await prisma.$transaction(
            async (tx) => {
                const newSchool = await tx.school.create({
                    data: {
                        name: parsed.data.name,
                        province: parsed.data.province || null,
                    },
                });

                // The conditional write is the lock-free claim that prevents concurrent requests.
                const claimedUser = await tx.user.updateMany({
                    where: {
                        id: session.user.id,
                        role: "school_admin",
                        schoolId: null,
                    },
                    data: {
                        schoolId: newSchool.id,
                        isPrimary: true,
                    },
                });

                if (claimedUser.count !== 1) {
                    throw new SchoolClaimError();
                }

                return newSchool;
            },
            { maxWait: 10000, timeout: 15000 },
        );

        revalidateDashboardCache();

        return {
            success: true,
            message: "สร้างโรงเรียนสำเร็จ",
            data: { schoolId: school.id },
        };
    } catch (error) {
        if (error instanceof SchoolClaimError) {
            return {
                success: false,
                message: "คุณมีโรงเรียนอยู่แล้วหรือไม่มีสิทธิ์สร้างโรงเรียน",
            };
        }

        return handleActionError({
            context: "createSchoolAndLink error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการสร้างโรงเรียน",
            },
        });
    }
}

/**
 * เพิ่มห้องเรียนเข้าโรงเรียน (school_admin only)
 */
export async function addSchoolClass(
    name: string,
    expectedStudentCount: number,
    academicYearId?: string,
): Promise<ClassActionResponse> {
    try {
        const session = await requireAuth();
        if (!canManageSchoolClasses(session.user)) {
            return { success: false, message: "ไม่มีสิทธิ์จัดการห้องเรียน" };
        }
        const schoolId = await resolveSchoolId(
            session.user.id,
            session.user.schoolId,
        );

        if (!schoolId) {
            return { success: false, message: "กรุณาตั้งค่าโรงเรียนก่อน" };
        }

        const parsedName = classNameSchema.safeParse(name.trim());
        if (!parsedName.success) {
            return {
                success: false,
                message: parsedName.error.issues[0].message,
            };
        }

        const parsedCount =
            expectedStudentCountSchema.safeParse(expectedStudentCount);
        if (!parsedCount.success) {
            return {
                success: false,
                message: parsedCount.error.issues[0].message,
            };
        }

        // Normalize ชื่อห้องเรียนให้เป็นรูปแบบมาตรฐาน เช่น "ม1/2" → "ม.1/2"
        const normalizedName = normalizeClassName(parsedName.data);

        const existing = await prisma.schoolClass.findUnique({
            where: { schoolId_name: { schoolId, name: normalizedName } },
        });

        if (existing) {
            return {
                success: false,
                message: `ห้อง "${normalizedName}" มีอยู่แล้ว`,
            };
        }

        const schoolClass = await prisma.schoolClass.create({
            data: {
                schoolId,
                name: normalizedName,
                expectedStudentCount: parsedCount.data,
            },
        });
        await upsertCurrentSchoolClassTerm(
            schoolClass.id,
            parsedCount.data,
            academicYearId,
        );

        revalidatePath(CLASSES_PATH);
        await revalidateAnalyticsCache(schoolId);

        return {
            success: true,
            message: "เพิ่มห้องเรียนสำเร็จ",
            data: {
                id: schoolClass.id,
                name: schoolClass.name,
                expectedStudentCount: schoolClass.expectedStudentCount,
            },
        };
    } catch (error) {
        return handleActionError({
            context: "addSchoolClass error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการเพิ่มห้องเรียน",
            },
        });
    }
}

/**
 * อัปเดตจำนวนนักเรียนจริงของห้องเรียน ใช้เป็นตัวหารใน analytics coverage
 */
export async function updateSchoolClassStudentCount(
    id: string,
    expectedStudentCount: number,
    academicYearId?: string,
): Promise<ClassActionResponse> {
    try {
        const session = await requireAuth();
        if (!canManageSchoolClasses(session.user)) {
            return { success: false, message: "ไม่มีสิทธิ์จัดการห้องเรียน" };
        }
        const schoolId = await resolveSchoolId(
            session.user.id,
            session.user.schoolId,
        );

        if (!schoolId) {
            return { success: false, message: "ไม่พบโรงเรียนของคุณ" };
        }

        const parsedCount =
            expectedStudentCountSchema.safeParse(expectedStudentCount);
        if (!parsedCount.success) {
            return {
                success: false,
                message: parsedCount.error.issues[0].message,
            };
        }

        const schoolClass = await prisma.schoolClass.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });
        if (!schoolClass) {
            return { success: false, message: "ไม่พบห้องเรียนที่ต้องการแก้ไข" };
        }

        const updated = await prisma.schoolClass.update({
            where: { id },
            data: { expectedStudentCount: parsedCount.data },
            select: { id: true, name: true, expectedStudentCount: true },
        });
        await upsertCurrentSchoolClassTerm(id, parsedCount.data, academicYearId);

        revalidatePath(CLASSES_PATH);
        await revalidateAnalyticsCache(schoolId);

        return {
            success: true,
            message: "อัปเดตจำนวนนักเรียนสำเร็จ",
            data: updated,
        };
    } catch (error) {
        return handleActionError({
            context: "updateSchoolClassStudentCount error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการอัปเดตจำนวนนักเรียน",
            },
        });
    }
}

/**
 * ลบห้องเรียน (school_admin only)
 */
export async function removeSchoolClass(
    id: string,
): Promise<ClassActionResponse> {
    try {
        const session = await requireAuth();
        if (!canManageSchoolClasses(session.user)) {
            return { success: false, message: "ไม่มีสิทธิ์จัดการห้องเรียน" };
        }
        const schoolId = await resolveSchoolId(
            session.user.id,
            session.user.schoolId,
        );

        if (!schoolId) {
            return { success: false, message: "ไม่พบโรงเรียนของคุณ" };
        }

        const schoolClass = await prisma.schoolClass.findUnique({
            where: { id },
        });

        if (!schoolClass || schoolClass.schoolId !== schoolId) {
            return { success: false, message: "ไม่พบห้องเรียนที่ต้องการลบ" };
        }

        const studentCount = await prisma.student.count({
            where: {
                schoolId,
                class: schoolClass.name,
            },
        });

        if (studentCount > 0) {
            return {
                success: false,
                message: `ไม่สามารถลบห้อง "${schoolClass.name}" ได้ เพราะมีนักเรียนอยู่ ${studentCount} คน `,
            };
        }

        await prisma.schoolClass.delete({ where: { id } });

        revalidatePath(CLASSES_PATH);
        await revalidateAnalyticsCache(schoolId);

        return { success: true, message: "ลบห้องเรียนสำเร็จ" };
    } catch (error) {
        return handleActionError({
            context: "removeSchoolClass error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการลบห้องเรียน",
            },
        });
    }
}

/**
 * ดึงรายการห้องเรียนของโรงเรียนตัวเอง
 */
export async function getSchoolClasses(
    academicYearId?: string,
): Promise<SchoolClassItem[]> {
    const session = await requireAuth();
    const schoolId = await resolveSchoolId(
        session.user.id,
        session.user.schoolId,
    );

    if (!schoolId) return [];

    const resolvedAcademicYearId =
        await ensureSchoolClassTermsForAcademicYear(schoolId, academicYearId);
    const classes = await prisma.schoolClass.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            expectedStudentCount: true,
            terms: {
                where: { academicYearId: resolvedAcademicYearId ?? "" },
                select: { expectedStudentCount: true },
                take: 1,
            },
        },
    });

    return classes.map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        expectedStudentCount:
            schoolClass.terms?.[0]?.expectedStudentCount ??
            schoolClass.expectedStudentCount,
    }));
}
