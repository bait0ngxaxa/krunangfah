"use server";

import { prisma } from "@/lib/database/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth/session";
import type {
    GetUsersOptions,
    UserListResponse,
    UserListItem,
    MutationResponse,
    ChangeableRole,
} from "@/types/user-management.types";
import type { Prisma } from "@prisma/client";
import { revalidateDashboardCache } from "./dashboard/cache";
import { revokeUserSessions } from "@/lib/auth/session-store";
import { staffAssignmentCommandSchema } from "@/lib/validations/staff-assignment.validation";
import {
    executeStaffAssignmentCommand,
    type StaffAssignmentCommand,
} from "@/lib/services/staff-assignment-command";

const DEFAULT_PAGE_SIZE = 15;

export async function getUsers(
    options: GetUsersOptions = {},
): Promise<UserListResponse> {
    await requireAdmin();

    const {
        schoolId,
        search,
        page = 1,
        pageSize = DEFAULT_PAGE_SIZE,
    } = options;

    const where: Prisma.UserWhereInput = { deletedAt: null };

    // Filter by school
    if (schoolId && schoolId !== "all") {
        where.schoolId = schoolId;
    }

    // Search by email or teacher name
    if (search && search.trim()) {
        const term = search.trim();
        where.OR = [
            { email: { contains: term, mode: "insensitive" } },
            {
                teacher: {
                    OR: [
                        { firstName: { contains: term, mode: "insensitive" } },
                        { lastName: { contains: term, mode: "insensitive" } },
                    ],
                },
            },
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            include: {
                school: { select: { name: true } },
                teacher: {
                    select: {
                        firstName: true,
                        lastName: true,
                        advisoryClass: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.user.count({ where }),
    ]);

    const mapped: UserListItem[] = users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isPrimary: u.isPrimary,
        schoolId: u.schoolId,
        schoolName: u.school?.name ?? null,
        hasTeacherProfile: u.teacher !== null,
        teacherName: u.teacher
            ? `${u.teacher.firstName} ${u.teacher.lastName}`
            : null,
        advisoryClass: u.teacher?.advisoryClass ?? null,
        createdAt: u.createdAt,
    }));

    return { users: mapped, total, page, pageSize };
}

/**
 * Change staff role among ผู้ดูแลโรงเรียน, ครูนางฟ้า, and ครูประจำชั้น.
 * Cannot change to/from system_admin
 */
export async function changeUserRole(
    userId: string,
    newRole: ChangeableRole,
): Promise<MutationResponse> {
    const session = await requireAdmin();
    const parsed = staffAssignmentCommandSchema.safeParse({
        userId,
        roleSelection: newRole,
    });
    if (!parsed.success) {
        return { success: false, message: "บทบาทไม่ถูกต้อง" };
    }
    const command: StaffAssignmentCommand = {
        userId: parsed.data.userId,
        roleSelection: parsed.data.roleSelection,
    };
    return executeStaffAssignmentCommand(command, session.user);
}

/**
 * Soft delete user and keep related historical data
 * System admin can delete non-system users.
 * Primary school admin can delete teachers in their own school.
 */
export async function deleteUser(userId: string): Promise<MutationResponse> {
    const session = await requireAuth();
    const isSystemAdmin = session.user.role === "system_admin";
    const isPrimaryAdmin =
        session.user.role === "school_admin" && session.user.isPrimary;

    if (!isSystemAdmin && !isPrimaryAdmin) {
        return { success: false, message: "ไม่มีสิทธิ์ลบผู้ใช้งาน" };
    }

    if (userId === session.user.id) {
        return { success: false, message: "ไม่สามารถลบบัญชีตัวเอง" };
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            email: true,
            isPrimary: true,
            schoolId: true,
            deletedAt: true,
            teacher: { select: { id: true } },
        },
    });

    if (!target) {
        return { success: false, message: "ไม่พบผู้ใช้งาน" };
    }

    if (target.role === "system_admin") {
        return { success: false, message: "ไม่สามารถลบ System Admin" };
    }

    if (target.isPrimary) {
        return { success: false, message: "ไม่สามารถลบ Primary Admin" };
    }

    if (target.deletedAt) {
        return { success: false, message: "ผู้ใช้นี้ถูกลบแล้ว" };
    }

    if (isPrimaryAdmin) {
        if (target.schoolId !== session.user.schoolId) {
            return { success: false, message: "ไม่สามารถลบครูต่างโรงเรียน" };
        }

        if (!target.teacher) {
            return { success: false, message: "ไม่พบโปรไฟล์ครู" };
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
    });

    await revokeUserSessions(userId);
    revalidateDashboardCache();
    return { success: true, message: `ปิดบัญชี ${target.email} สำเร็จ` };
}

/**
 * Get school classes by schoolId (for system_admin edit form)
 */
export async function getClassesBySchool(
    schoolId: string,
): Promise<{ id: string; name: string }[]> {
    await requireAdmin();

    return prisma.schoolClass.findMany({
        where: { schoolId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
}

/**
 * Update teacher advisory class + auto-set role
 * "ทุกห้อง" → school_admin, ห้องจริง → class_teacher
 * Allowed: system_admin (any teacher) or primary school_admin (own school only)
 */
export async function updateTeacherProfile(
    userId: string,
    data: { advisoryClass: string },
): Promise<MutationResponse> {
    const session = await requireAuth();
    const parsed = staffAssignmentCommandSchema.safeParse({
        userId,
        advisoryClass: data.advisoryClass,
    });
    if (!parsed.success) {
        return { success: false, message: "กรุณาเลือกห้องที่ปรึกษา" };
    }
    const command: StaffAssignmentCommand = {
        userId: parsed.data.userId,
        advisoryClass: parsed.data.advisoryClass,
    };
    return executeStaffAssignmentCommand(command, session.user);
}

/**
 * Get registered teachers in a school (for primary school_admin)
 */
export async function getSchoolTeachers(
    schoolId?: string,
): Promise<UserListItem[]> {
    const session = await requireAuth();

    const isSystemAdmin = session.user.role === "system_admin";
    const isPrimaryAdmin =
        session.user.role === "school_admin" && session.user.isPrimary;

    if (!isSystemAdmin && !isPrimaryAdmin) return [];

    const targetSchoolId = isSystemAdmin
        ? schoolId
        : session.user.schoolId ?? undefined;

    if (!targetSchoolId) return [];

    const users = await prisma.user.findMany({
        where: {
            schoolId: targetSchoolId,
            deletedAt: null,
            teacher: { isNot: null },
        },
        include: {
            school: { select: { name: true } },
            teacher: {
                select: {
                    firstName: true,
                    lastName: true,
                    advisoryClass: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isPrimary: u.isPrimary,
        schoolId: u.schoolId,
        schoolName: u.school?.name ?? null,
        hasTeacherProfile: true,
        teacherName: u.teacher
            ? `${u.teacher.firstName} ${u.teacher.lastName}`
            : null,
        advisoryClass: u.teacher?.advisoryClass ?? null,
        createdAt: u.createdAt,
    }));
}
