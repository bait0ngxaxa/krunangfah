"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/session";
import type {
    GetUsersOptions,
    UserListResponse,
    UserListItem,
    MutationResponse,
    ChangeableRole,
} from "@/types/user-management.types";
import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";

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

    const where: Prisma.UserWhereInput = {};

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

const VALID_ROLES: ChangeableRole[] = ["school_admin", "class_teacher"];

/**
 * Change user role (school_admin ↔ class_teacher only)
 * Cannot change to/from system_admin
 */
export async function changeUserRole(
    userId: string,
    newRole: ChangeableRole,
): Promise<MutationResponse> {
    const session = await requireAdmin();

    if (!VALID_ROLES.includes(newRole)) {
        return { success: false, message: "บทบาทไม่ถูกต้อง" };
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isPrimary: true, teacher: { select: { id: true, advisoryClass: true } } },
    });

    if (!target) {
        return { success: false, message: "ไม่พบผู้ใช้งาน" };
    }

    if (target.role === "system_admin") {
        return { success: false, message: "ไม่สามารถเปลี่ยนบทบาทของ System Admin" };
    }

    if (target.isPrimary) {
        return { success: false, message: "ไม่สามารถเปลี่ยนบทบาทของ Primary Admin เพราะโรงเรียนจะไม่มีผู้ดูแลหลัก" };
    }

    if (target.id === session.user.id) {
        return { success: false, message: "ไม่สามารถเปลี่ยนบทบาทของตัวเอง" };
    }

    if (target.role === newRole) {
        return { success: false, message: "บทบาทไม่เปลี่ยนแปลง" };
    }

    // class_teacher ต้องมี teacher profile + advisoryClass ที่เป็นห้องจริง
    // school_admin ได้ advisoryClass = "ทุกห้อง" ตอนสร้างโปรไฟล์ ซึ่งใช้กับ class_teacher ไม่ได้
    if (newRole === "class_teacher") {
        if (!target.teacher) {
            return {
                success: false,
                message: "ผู้ใช้ยังไม่มีโปรไฟล์ครู ไม่สามารถเปลี่ยนเป็นครูประจำชั้นได้",
            };
        }
        if (target.teacher.advisoryClass === "ทุกห้อง") {
            return {
                success: false,
                message: "ผู้ใช้มี advisory class เป็น \"ทุกห้อง\" ต้องแก้ไขให้เป็นห้องเรียนจริงก่อน",
            };
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
    });

    revalidateTag("dashboard", "default");
    return { success: true, message: "เปลี่ยนบทบาทสำเร็จ" };
}

/**
 * Delete user and all related data
 * Cannot delete yourself or other system_admins
 */
export async function deleteUser(userId: string): Promise<MutationResponse> {
    const session = await requireAdmin();

    if (userId === session.user.id) {
        return { success: false, message: "ไม่สามารถลบบัญชีตัวเอง" };
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, email: true },
    });

    if (!target) {
        return { success: false, message: "ไม่พบผู้ใช้งาน" };
    }

    if (target.role === "system_admin") {
        return { success: false, message: "ไม่สามารถลบ System Admin" };
    }

    // Transaction: clean up all FK references, then delete user
    await prisma.$transaction([
        // Nullify optional FK references
        prisma.activityProgress.updateMany({
            where: { teacherId: userId },
            data: { teacherId: null },
        }),
        // Delete records that reference this user (non-nullable FK)
        prisma.homeVisit.deleteMany({ where: { createdById: userId } }),
        prisma.studentReferral.deleteMany({
            where: { OR: [{ fromTeacherUserId: userId }, { toTeacherUserId: userId }] },
        }),
        prisma.counselingSession.deleteMany({ where: { createdById: userId } }),
        prisma.worksheetUpload.deleteMany({ where: { uploadedById: userId } }),
        prisma.phqResult.deleteMany({ where: { importedById: userId } }),
        prisma.teacherInvite.deleteMany({ where: { invitedById: userId } }),
        prisma.schoolAdminInvite.deleteMany({ where: { createdBy: userId } }),
        // Delete user (cascades to Teacher)
        prisma.user.delete({ where: { id: userId } }),
    ]);

    revalidateTag("dashboard", "default");
    return { success: true, message: `ลบผู้ใช้ ${target.email} สำเร็จ` };
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

    const isSystemAdmin = session.user.role === "system_admin";
    const isPrimaryAdmin =
        session.user.role === "school_admin" && session.user.isPrimary;

    if (!isSystemAdmin && !isPrimaryAdmin) {
        return { success: false, message: "ไม่มีสิทธิ์แก้ไข" };
    }

    const advisoryClass = data.advisoryClass.trim();
    if (!advisoryClass) {
        return { success: false, message: "กรุณาเลือกห้องที่ปรึกษา" };
    }

    const teacher = await prisma.teacher.findUnique({
        where: { userId },
        select: {
            id: true,
            user: {
                select: {
                    id: true,
                    role: true,
                    isPrimary: true,
                    schoolId: true,
                },
            },
        },
    });

    if (!teacher) {
        return { success: false, message: "ไม่พบโปรไฟล์ครู" };
    }

    if (teacher.user.id === session.user.id) {
        return { success: false, message: "ไม่สามารถแก้ไขข้อมูลตัวเอง" };
    }

    if (teacher.user.role === "system_admin") {
        return { success: false, message: "ไม่สามารถแก้ไข System Admin" };
    }

    // primary school_admin can only edit teachers in their own school
    if (isPrimaryAdmin && teacher.user.schoolId !== session.user.schoolId) {
        return { success: false, message: "ไม่สามารถแก้ไขครูต่างโรงเรียน" };
    }

    // Primary admin ต้องเป็น "ทุกห้อง" เท่านั้น
    if (teacher.user.isPrimary && advisoryClass !== "ทุกห้อง") {
        return {
            success: false,
            message: "Primary Admin ต้องดูแลทุกห้อง ไม่สามารถเปลี่ยนเป็นห้องเรียนเฉพาะได้",
        };
    }

    // Validate that the class exists in the teacher's school
    if (teacher.user.schoolId && advisoryClass !== "ทุกห้อง") {
        const classExists = await prisma.schoolClass.findFirst({
            where: { schoolId: teacher.user.schoolId, name: advisoryClass },
        });
        if (!classExists) {
            return { success: false, message: "ไม่พบห้องเรียนนี้ในโรงเรียน" };
        }
    }

    // Auto-determine role from advisoryClass
    const newRole =
        advisoryClass === "ทุกห้อง" ? "school_admin" : "class_teacher";

    await prisma.$transaction([
        prisma.teacher.update({
            where: { userId },
            data: { advisoryClass },
        }),
        prisma.user.update({
            where: { id: userId },
            data: { role: newRole },
        }),
    ]);

    revalidateTag("dashboard", "default");
    return { success: true, message: "แก้ไขห้องที่ปรึกษาสำเร็จ" };
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
