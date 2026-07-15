"use server";

import { prisma } from "@/lib/database/prisma";
import { requirePrimaryAdmin, requireAuth } from "@/lib/auth/session";
import { invalidateUserSessionCaches } from "@/lib/auth/session-store";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { SchoolAdminItem, PrimaryToggleResponse } from "@/types/primary-admin.types";

/**
 * ดึงรายชื่อ school_admin ที่ลงทะเบียนแล้วในโรงเรียนเดียวกัน
 * เฉพาะ school_admin เท่านั้น (ไม่รวม class_teacher)
 */
export async function getSchoolAdmins(): Promise<SchoolAdminItem[]> {
    const session = await requireAuth();
    const schoolId = session.user.schoolId;

    if (!schoolId) {
        return [];
    }

    const admins = await prisma.user.findMany({
        where: {
            schoolId,
            role: "school_admin",
            deletedAt: null,
        },
        select: {
            id: true,
            email: true,
            isPrimary: true,
            teacher: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
        },
        orderBy: [
            { isPrimary: "desc" },
            { createdAt: "asc" },
        ],
    });

    return admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        isPrimary: admin.isPrimary,
        teacherName: admin.teacher
            ? `${admin.teacher.firstName} ${admin.teacher.lastName}`
            : undefined,
    }));
}

/**
 * Toggle isPrimary ของ school_admin คนอื่นในโรงเรียนเดียวกัน
 * - ใช้ requirePrimaryAdmin() guard
 * - ตรวจสอบ: target ต้องเป็น school_admin + อยู่โรงเรียนเดียวกัน
 * - ป้องกันถอด primary ตัวเอง
 */
export async function togglePrimaryStatus(
    targetUserId: string,
): Promise<PrimaryToggleResponse> {
    const session = await requirePrimaryAdmin();
    const currentUserId = session.user.id;
    const schoolId = session.user.schoolId;

    // ป้องกันถอด primary ตัวเอง
    if (targetUserId === currentUserId) {
        return {
            success: false,
            message: "ไม่สามารถเปลี่ยนสิทธิ์ primary ของตัวเองได้",
        };
    }

    if (!schoolId) return { success: false, message: "ไม่พบโรงเรียนของคุณ" };
    const result = await runPrimaryAdminTransaction(
        targetUserId,
        schoolId,
    );
    if (!result.success) return result;

    await invalidateUserSessionCaches(targetUserId);
    revalidatePath("/school/classes");

    const statusText = result.isPrimary ? "เพิ่มสิทธิ์" : "ถอดสิทธิ์";
    return {
        success: true,
        message: `${statusText} Primary Admin สำเร็จ`,
    };
}

async function runPrimaryAdminTransaction(
    targetUserId: string,
    schoolId: string,
): Promise<PrimaryToggleResponse & { isPrimary?: boolean }> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await prisma.$transaction(
                (tx) => togglePrimaryInTransaction(tx, targetUserId, schoolId),
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (error) {
            if (!isRetryableTransactionConflict(error) || attempt === 2) throw error;
            await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
        }
    }
    throw new Error("Primary Admin transaction retry exhausted");
}

async function togglePrimaryInTransaction(
    tx: Prisma.TransactionClient,
    targetUserId: string,
    schoolId: string,
): Promise<PrimaryToggleResponse & { isPrimary?: boolean }> {
    const target = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true, schoolId: true, isPrimary: true, deletedAt: true },
    });
    const error = validatePrimaryTarget(target, schoolId);
    if (error) return error;
    if (!target) return { success: false, message: "ไม่พบผู้ใช้งานที่ระบุ" };

    if (target.isPrimary) {
        const primaryCount = await tx.user.count({
            where: { schoolId, role: "school_admin", isPrimary: true, deletedAt: null },
        });
        if (primaryCount <= 1) {
            return { success: false, message: "โรงเรียนต้องมี Primary Admin อย่างน้อย 1 คน" };
        }
    }
    const updated = await tx.user.updateMany({
        where: { id: targetUserId, deletedAt: null, isPrimary: target.isPrimary },
        data: { isPrimary: !target.isPrimary },
    });
    if (updated.count !== 1) return { success: false, message: "ข้อมูลผู้ใช้มีการเปลี่ยนแปลง กรุณาลองใหม่" };
    return { success: true, message: "", isPrimary: !target.isPrimary };
}

function validatePrimaryTarget(
    target: { role: string; schoolId: string | null; deletedAt: Date | null } | null,
    schoolId: string,
): PrimaryToggleResponse | null {
    if (!target) return { success: false, message: "ไม่พบผู้ใช้งานที่ระบุ" };
    if (target.role !== "school_admin") return { success: false, message: "สามารถเปลี่ยนสิทธิ์ primary ได้เฉพาะ school_admin เท่านั้น" };
    if (target.schoolId !== schoolId) return { success: false, message: "ไม่สามารถเปลี่ยนสิทธิ์ผู้ดูแลจากโรงเรียนอื่นได้" };
    if (target.deletedAt) return { success: false, message: "ไม่สามารถเปลี่ยนสิทธิ์บัญชีที่ปิดใช้งานแล้ว" };
    return null;
}

function isRetryableTransactionConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}
