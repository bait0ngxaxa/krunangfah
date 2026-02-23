"use server";

import { prisma } from "@/lib/prisma";
import { requirePrimaryAdmin, requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
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

    // ตรวจสอบ target ว่าเป็น school_admin ในโรงเรียนเดียวกัน
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
            id: true,
            role: true,
            schoolId: true,
            isPrimary: true,
        },
    });

    if (!targetUser) {
        return {
            success: false,
            message: "ไม่พบผู้ใช้งานที่ระบุ",
        };
    }

    if (targetUser.role !== "school_admin") {
        return {
            success: false,
            message: "สามารถเปลี่ยนสิทธิ์ primary ได้เฉพาะ school_admin เท่านั้น",
        };
    }

    if (targetUser.schoolId !== schoolId) {
        return {
            success: false,
            message: "ไม่สามารถเปลี่ยนสิทธิ์ผู้ดูแลจากโรงเรียนอื่นได้",
        };
    }

    // Toggle isPrimary
    const newPrimaryStatus = !targetUser.isPrimary;

    await prisma.user.update({
        where: { id: targetUserId },
        data: { isPrimary: newPrimaryStatus },
    });

    revalidatePath("/school/classes");

    const statusText = newPrimaryStatus ? "เพิ่มสิทธิ์" : "ถอดสิทธิ์";
    return {
        success: true,
        message: `${statusText} Primary Admin สำเร็จ`,
    };
}
