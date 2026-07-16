"use server";

import { prisma } from "@/lib/database/prisma";
import { requirePrimaryAdmin, requireAuth } from "@/lib/auth/session";
import { executeStaffAssignmentCommand } from "@/lib/services/staff-assignment-command";
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
    const result = await executeStaffAssignmentCommand(
        { userId: targetUserId, togglePrimary: true },
        session.user,
    );
    if (!result.success) return result;

    const statusText = result.isPrimary ? "เพิ่มสิทธิ์" : "ถอดสิทธิ์";
    return {
        success: true,
        message: `${statusText} Primary Admin สำเร็จ`,
    };
}
