"use server";

import { prisma } from "@/lib/database/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth/session";
import type {
    GetUsersOptions,
    UserListResponse,
    UserListItem,
    MutationResponse,
    ChangeableRole,
    StaffRoleSelection,
} from "@/types/user-management.types";
import type { Prisma, UserRole } from "@prisma/client";
import { revalidateDashboardCache } from "./dashboard/cache";
import { deleteUserSessionCaches } from "@/lib/auth/session-cache";
import { revokeUserSessions } from "@/lib/auth/session-store";
import { ADMIN_ADVISORY_CLASS } from "@/lib/constants/advisory-class";

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

const VALID_ROLE_SELECTIONS: ChangeableRole[] = [
    "primary_school_admin",
    "angel_teacher",
    "school_admin",
    "class_teacher",
];

/**
 * Change staff role among ผู้ดูแลโรงเรียน, ครูนางฟ้า, and ครูประจำชั้น.
 * Cannot change to/from system_admin
 */
export async function changeUserRole(
    userId: string,
    newRole: ChangeableRole,
): Promise<MutationResponse> {
    const session = await requireAdmin();

    if (!VALID_ROLE_SELECTIONS.includes(newRole)) {
        return { success: false, message: "บทบาทไม่ถูกต้อง" };
    }

    const assignment = toRoleAssignment(newRole);
    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            isPrimary: true,
            schoolId: true,
            deletedAt: true,
            teacher: { select: { id: true, advisoryClass: true } },
        },
    });

    if (!target) {
        return { success: false, message: "ไม่พบผู้ใช้งาน" };
    }

    if (target.role === "system_admin") {
        return { success: false, message: "ไม่สามารถเปลี่ยนบทบาทของ System Admin" };
    }

    if (target.deletedAt) {
        return { success: false, message: "ผู้ใช้นี้ถูกลบแล้ว" };
    }

    if (target.id === session.user.id) {
        return { success: false, message: "ไม่สามารถเปลี่ยนบทบาทของตัวเอง" };
    }

    if (getCurrentAssignment(target) === assignment.selection) {
        return { success: false, message: "บทบาทไม่เปลี่ยนแปลง" };
    }

    if (await blocksSolePrimaryDemotion(target, assignment.selection)) {
        return {
            success: false,
            message:
                "โรงเรียนนี้มีผู้ดูแลโรงเรียนเพียงคนเดียว ต้องเพิ่มผู้ดูแลโรงเรียนอีกคนก่อนเปลี่ยนบทบาท",
        };
    }

    // class_teacher ต้องมี teacher profile + advisoryClass ที่เป็นห้องจริง
    // school_admin ได้ advisoryClass = "ทุกห้อง" ซึ่งใช้กับ class_teacher ไม่ได้
    if (assignment.selection === "class_teacher") {
        if (!target.teacher) {
            return {
                success: false,
                message: "ผู้ใช้ยังไม่มีโปรไฟล์ครู ไม่สามารถเปลี่ยนเป็นครูประจำชั้นได้",
            };
        }
        if (target.teacher.advisoryClass === ADMIN_ADVISORY_CLASS) {
            return {
                success: false,
                message: "ผู้ใช้มี advisory class เป็น \"ทุกห้อง\" ต้องแก้ไขให้เป็นห้องเรียนจริงก่อน",
            };
        }
    }

    if (assignment.role === "school_admin" && target.teacher) {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { role: assignment.role, isPrimary: assignment.isPrimary },
            }),
            prisma.teacher.update({
                where: { userId },
                data: { advisoryClass: ADMIN_ADVISORY_CLASS },
            }),
        ]);
    } else {
        await prisma.user.update({
            where: { id: userId },
            data: { role: assignment.role, isPrimary: assignment.isPrimary },
        });
    }

    await deleteUserSessionCaches(userId);
    revalidateDashboardCache();
    return { success: true, message: "เปลี่ยนบทบาทสำเร็จ" };
}

interface RoleAssignment {
    selection: StaffRoleSelection;
    role: Extract<UserRole, "school_admin" | "class_teacher">;
    isPrimary: boolean;
}

function toRoleAssignment(role: ChangeableRole): RoleAssignment {
    if (role === "primary_school_admin") {
        return {
            selection: "primary_school_admin",
            role: "school_admin",
            isPrimary: true,
        };
    }
    if (role === "class_teacher") {
        return {
            selection: "class_teacher",
            role: "class_teacher",
            isPrimary: false,
        };
    }
    return {
        selection: "angel_teacher",
        role: "school_admin",
        isPrimary: false,
    };
}

function getCurrentAssignment(user: {
    role: UserRole;
    isPrimary: boolean;
}): StaffRoleSelection {
    if (user.role === "school_admin" && user.isPrimary) {
        return "primary_school_admin";
    }
    if (user.role === "school_admin") return "angel_teacher";
    return "class_teacher";
}

async function blocksSolePrimaryDemotion(
    user: { isPrimary: boolean; schoolId: string | null },
    nextSelection: StaffRoleSelection,
): Promise<boolean> {
    if (!user.isPrimary || nextSelection === "primary_school_admin") return false;
    return isSolePrimaryAdmin(user.schoolId);
}

async function isSolePrimaryAdmin(schoolId: string | null): Promise<boolean> {
    if (!schoolId) return true;
    const primaryCount = await prisma.user.count({
        where: {
            schoolId,
            role: "school_admin",
            isPrimary: true,
            deletedAt: null,
        },
    });
    return primaryCount <= 1;
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
        data: {
            deletedAt: new Date(),
            password: null,
        },
    });

    await revokeUserSessions(userId);
    revalidateDashboardCache();
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
                    deletedAt: true,
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

    if (teacher.user.deletedAt) {
        return { success: false, message: "ผู้ใช้นี้ถูกลบแล้ว" };
    }

    // primary school_admin can only edit teachers in their own school
    if (isPrimaryAdmin && teacher.user.schoolId !== session.user.schoolId) {
        return { success: false, message: "ไม่สามารถแก้ไขครูต่างโรงเรียน" };
    }

    if (
        teacher.user.isPrimary &&
        advisoryClass !== ADMIN_ADVISORY_CLASS &&
        (await isSolePrimaryAdmin(teacher.user.schoolId))
    ) {
        return {
            success: false,
            message:
                "โรงเรียนนี้มีผู้ดูแลโรงเรียนเพียงคนเดียว ต้องเพิ่มผู้ดูแลโรงเรียนอีกคนก่อนเปลี่ยนเป็นครูประจำชั้น",
        };
    }

    // Validate that the class exists in the teacher's school
    if (teacher.user.schoolId && advisoryClass !== ADMIN_ADVISORY_CLASS) {
        const classExists = await prisma.schoolClass.findFirst({
            where: { schoolId: teacher.user.schoolId, name: advisoryClass },
        });
        if (!classExists) {
            return { success: false, message: "ไม่พบห้องเรียนนี้ในโรงเรียน" };
        }
    }

    // Auto-determine role from advisoryClass
    const newRole =
        advisoryClass === ADMIN_ADVISORY_CLASS ? "school_admin" : "class_teacher";

    await prisma.$transaction([
        prisma.teacher.update({
            where: { userId },
            data: { advisoryClass },
        }),
        prisma.user.update({
            where: { id: userId },
            data: {
                role: newRole,
                isPrimary: advisoryClass === ADMIN_ADVISORY_CLASS
                    ? teacher.user.isPrimary
                    : false,
            },
        }),
    ]);

    await deleteUserSessionCaches(userId);
    revalidateDashboardCache();
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
