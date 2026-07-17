"use server";

import type { UserRole, ProjectRole } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import {
    canManageTeacherRoster,
    canViewTeacherRoster,
} from "@/lib/auth/teacher-management-policy";
import { handleActionError } from "./error-handler";
import { ADMIN_ADVISORY_CLASS } from "@/lib/constants/advisory-class";
import {
    teacherRosterSchema,
    type TeacherRosterFormData,
} from "@/lib/validations/teacher-roster.validation";
import type {
    TeacherRosterItem,
    RosterActionResponse,
    RosterEntryStatus,
} from "@/types/school-setup.types";

/**
 * Resolve schoolId — reuse pattern from school-setup.actions
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

function toRosterItem(
    row: {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        age: number;
        userRole: string;
        advisoryClass: string;
        schoolRole: string;
        projectRole: string;
        inviteSent: boolean;
    },
    status: RosterEntryStatus = "draft",
): TeacherRosterItem {
    return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email ?? undefined,
        age: row.age,
        userRole: row.userRole as TeacherRosterItem["userRole"],
        advisoryClass: row.advisoryClass,
        schoolRole: row.schoolRole,
        projectRole: row.projectRole as TeacherRosterItem["projectRole"],
        inviteSent: row.inviteSent,
        status,
    };
}

// --- Status resolution helpers ---

interface InviteMatch {
    rosterId: string | null;
    acceptedAt: Date | null;
    expiresAt: Date;
}
/**
 * Resolve roster status only from its explicit invite relation.
 */
function buildRosterStatusMap(
    invites: InviteMatch[],
): ReadonlyMap<string, RosterEntryStatus> {
    const now = new Date();
    const statuses = new Map<string, RosterEntryStatus>();

    for (const invite of invites) {
        if (!invite.rosterId) continue;
        if (invite.acceptedAt) {
            statuses.set(invite.rosterId, "accepted");
            continue;
        }
        if (
            invite.expiresAt > now &&
            statuses.get(invite.rosterId) !== "accepted"
        ) {
            statuses.set(invite.rosterId, "pending");
        }
    }

    return statuses;
}

/**
 * Check if a roster entry has a pending invite (for guards)
 */
async function hasPendingInviteForEntry(rosterId: string): Promise<boolean> {
    const invite = await prisma.teacherInvite.findFirst({
        where: {
            rosterId,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
        },
    });
    return invite !== null;
}

async function validateRosterEmailAvailable(
    schoolId: string,
    email: string,
    excludeRosterId?: string,
): Promise<string | null> {
    const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });

    if (existingUser) {
        return "อีเมลนี้มีผู้ใช้งานแล้ว";
    }

    const existingInvite = await prisma.teacherInvite.findFirst({
        where: {
            email,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
        },
        select: { id: true },
    });

    if (existingInvite) {
        return "มีคำเชิญที่รอดำเนินการสำหรับอีเมลนี้แล้ว";
    }

    const existingRoster = await prisma.schoolTeacherRoster.findFirst({
        where: {
            schoolId,
            email,
            ...(excludeRosterId ? { id: { not: excludeRosterId } } : {}),
        },
        select: { id: true },
    });

    if (existingRoster) {
        return `อีเมล "${email}" มีอยู่ใน roster แล้ว`;
    }

    return null;
}

/**
 * เพิ่มครูเข้า roster (school_admin only)
 */
export async function addTeacherToRoster(
    input: TeacherRosterFormData,
): Promise<RosterActionResponse> {
    try {
        const session = await requireAuth();
        if (!canManageTeacherRoster(session.user)) {
            return { success: false, message: "ไม่มีสิทธิ์จัดการรายชื่อครู" };
        }
        const schoolId = await resolveSchoolId(
            session.user.id,
            session.user.schoolId,
        );

        if (!schoolId) {
            return { success: false, message: "กรุณาตั้งค่าโรงเรียนก่อน" };
        }

        const parsed = teacherRosterSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                message: parsed.error.issues[0].message,
            };
        }

        const { email, ...rest } = parsed.data;
        const cleanEmail = email.trim();

        const emailConflict = await validateRosterEmailAvailable(
            schoolId,
            cleanEmail,
        );
        if (emailConflict) {
            return {
                success: false,
                message: emailConflict,
            };
        }

        const entry = await prisma.schoolTeacherRoster.create({
            data: {
                schoolId,
                firstName: rest.firstName.trim(),
                lastName: rest.lastName.trim(),
                email: cleanEmail,
                age: rest.age,
                userRole: rest.userRole as UserRole,
                advisoryClass:
                    rest.userRole === "school_admin"
                        ? ADMIN_ADVISORY_CLASS
                        : rest.advisoryClass,
                schoolRole: rest.schoolRole.trim(),
                projectRole: rest.projectRole as ProjectRole,
            },
        });

        return {
            success: true,
            message: "เพิ่มครูใน roster สำเร็จ",
            data: toRosterItem(entry, "draft"),
        };
    } catch (error) {
        return handleActionError({
            context: "addTeacherToRoster error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการเพิ่มครู",
            },
        });
    }
}

/**
 * ลบครูออกจาก roster (school_admin only)
 */
export async function removeFromRoster(
    id: string,
): Promise<RosterActionResponse> {
    try {
        const session = await requireAuth();
        if (!canManageTeacherRoster(session.user)) {
            return { success: false, message: "ไม่มีสิทธิ์จัดการรายชื่อครู" };
        }
        const schoolId = await resolveSchoolId(
            session.user.id,
            session.user.schoolId,
        );

        if (!schoolId) {
            return { success: false, message: "ไม่พบโรงเรียนของคุณ" };
        }

        const entry = await prisma.schoolTeacherRoster.findUnique({
            where: { id },
        });

        if (!entry || entry.schoolId !== schoolId) {
            return { success: false, message: "ไม่พบรายชื่อครูที่ต้องการลบ" };
        }

        // Guard: reject if entry has a pending invite
        const isPending = await hasPendingInviteForEntry(entry.id);
        if (isPending) {
            return {
                success: false,
                message:
                    "ไม่สามารถลบได้ เนื่องจากมีคำเชิญที่รอดำเนินการ กรุณายกเลิกคำเชิญก่อน",
            };
        }

        await prisma.schoolTeacherRoster.delete({ where: { id } });

        return { success: true, message: "ลบออกจาก roster สำเร็จ" };
    } catch (error) {
        return handleActionError({
            context: "removeFromRoster error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการลบครู",
            },
        });
    }
}

/**
 * ดึงรายชื่อครูทั้งหมดใน roster ของโรงเรียน
 * Parallel-fetches invites + users to compute status per entry.
 * Filters out "accepted" entries.
 */
export async function getSchoolRoster(): Promise<TeacherRosterItem[]> {
    const session = await requireAuth();
    if (!canViewTeacherRoster(session.user)) return [];

    const schoolId = await resolveSchoolId(
        session.user.id,
        session.user.schoolId,
    );

    if (!schoolId) return [];

    const [rows, invites] = await Promise.all([
        prisma.schoolTeacherRoster.findMany({
            where: { schoolId },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        }),
        prisma.teacherInvite.findMany({
            where: { schoolId },
            select: {
                rosterId: true,
                acceptedAt: true,
                expiresAt: true,
            },
        }),
    ]);

    const statuses = buildRosterStatusMap(invites);
    return rows
        .map((row) => {
            const status = statuses.get(row.id) ?? "draft";
            return toRosterItem(row, status);
        })
        .filter((item) => item.status !== "accepted");
}

/**
 * แก้ไขข้อมูลครูใน roster (school_admin only)
 */
export async function updateRosterEntry(
    id: string,
    input: TeacherRosterFormData,
): Promise<RosterActionResponse> {
    try {
        const session = await requireAuth();
        if (!canManageTeacherRoster(session.user)) {
            return { success: false, message: "ไม่มีสิทธิ์จัดการรายชื่อครู" };
        }
        const schoolId = await resolveSchoolId(
            session.user.id,
            session.user.schoolId,
        );

        if (!schoolId) {
            return { success: false, message: "ไม่พบโรงเรียนของคุณ" };
        }

        const entry = await prisma.schoolTeacherRoster.findUnique({
            where: { id },
        });

        if (!entry || entry.schoolId !== schoolId) {
            return {
                success: false,
                message: "ไม่พบรายชื่อครูที่ต้องการแก้ไข",
            };
        }

        // Guard: reject if entry has a pending invite
        const isPending = await hasPendingInviteForEntry(entry.id);
        if (isPending) {
            return {
                success: false,
                message:
                    "ไม่สามารถแก้ไขได้ เนื่องจากมีคำเชิญที่รอดำเนินการ กรุณายกเลิกคำเชิญก่อน",
            };
        }

        const parsed = teacherRosterSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                message: parsed.error.issues[0].message,
            };
        }

        const { email, ...rest } = parsed.data;
        const cleanEmail = email.trim();

        const emailConflict = await validateRosterEmailAvailable(
            schoolId,
            cleanEmail,
            id,
        );
        if (emailConflict) {
            return {
                success: false,
                message: emailConflict,
            };
        }

        const updated = await prisma.schoolTeacherRoster.update({
            where: { id },
            data: {
                firstName: rest.firstName.trim(),
                lastName: rest.lastName.trim(),
                email: cleanEmail,
                age: rest.age,
                userRole: rest.userRole as UserRole,
                advisoryClass:
                    rest.userRole === "school_admin"
                        ? ADMIN_ADVISORY_CLASS
                        : rest.advisoryClass,
                schoolRole: rest.schoolRole.trim(),
                projectRole: rest.projectRole as ProjectRole,
            },
        });

        return {
            success: true,
            message: "แก้ไขข้อมูลสำเร็จ",
            data: toRosterItem(updated, "draft"),
        };
    } catch (error) {
        return handleActionError({
            context: "updateRosterEntry error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการแก้ไข",
            },
        });
    }
}
