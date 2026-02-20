"use server";

import { z } from "zod";
import { UserRole, ProjectRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePrimaryAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
    teacherRosterSchema,
    type TeacherRosterFormData,
} from "@/lib/validations/teacher-roster.validation";
import type {
    TeacherRosterItem,
    RosterActionResponse,
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

function toRosterItem(row: {
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
}): TeacherRosterItem {
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
    };
}

/**
 * เพิ่มครูเข้า roster (school_admin only)
 */
export async function addTeacherToRoster(
    input: TeacherRosterFormData,
): Promise<RosterActionResponse> {
    try {
        const session = await requirePrimaryAdmin();
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
        const cleanEmail = email?.trim() || null;

        // Check duplicate email within same school
        if (cleanEmail) {
            const existing = await prisma.schoolTeacherRoster.findUnique({
                where: {
                    schoolId_email: { schoolId, email: cleanEmail },
                },
            });
            if (existing) {
                return {
                    success: false,
                    message: `อีเมล "${cleanEmail}" มีอยู่ใน roster แล้ว`,
                };
            }
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
                        ? "ทุกห้อง"
                        : rest.advisoryClass,
                schoolRole: rest.schoolRole.trim(),
                projectRole: rest.projectRole as ProjectRole,
            },
        });

        return {
            success: true,
            message: "เพิ่มครูใน roster สำเร็จ",
            data: toRosterItem(entry),
        };
    } catch (error) {
        console.error("addTeacherToRoster error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการเพิ่มครู" };
    }
}

/**
 * ลบครูออกจาก roster (school_admin only)
 */
export async function removeFromRoster(
    id: string,
): Promise<RosterActionResponse> {
    try {
        const session = await requirePrimaryAdmin();
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

        await prisma.schoolTeacherRoster.delete({ where: { id } });

        return { success: true, message: "ลบออกจาก roster สำเร็จ" };
    } catch (error) {
        console.error("removeFromRoster error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบครู" };
    }
}

/**
 * ดึงรายชื่อครูทั้งหมดใน roster ของโรงเรียน
 */
export async function getSchoolRoster(): Promise<TeacherRosterItem[]> {
    const session = await requireAuth();
    const schoolId = session.user.schoolId;

    if (!schoolId) return [];

    const rows = await prisma.schoolTeacherRoster.findMany({
        where: { schoolId },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return rows.map(toRosterItem);
}

/**
 * แก้ไขข้อมูลครูใน roster (school_admin only)
 */
export async function updateRosterEntry(
    id: string,
    input: TeacherRosterFormData,
): Promise<RosterActionResponse> {
    try {
        const session = await requirePrimaryAdmin();
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

        const parsed = teacherRosterSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                message: parsed.error.issues[0].message,
            };
        }

        const { email, ...rest } = parsed.data;
        const cleanEmail = email?.trim() || null;

        // Check duplicate email (exclude current entry)
        if (cleanEmail) {
            const dup = await prisma.schoolTeacherRoster.findFirst({
                where: {
                    schoolId,
                    email: cleanEmail,
                    id: { not: id },
                },
            });
            if (dup) {
                return {
                    success: false,
                    message: `อีเมล "${cleanEmail}" มีอยู่ใน roster แล้ว`,
                };
            }
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
                        ? "ทุกห้อง"
                        : rest.advisoryClass,
                schoolRole: rest.schoolRole.trim(),
                projectRole: rest.projectRole as ProjectRole,
            },
        });

        return {
            success: true,
            message: "แก้ไขข้อมูลสำเร็จ",
            data: toRosterItem(updated),
        };
    } catch (error) {
        console.error("updateRosterEntry error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการแก้ไข" };
    }
}

/**
 * Mark roster entry as invite sent
 */
export async function markRosterInviteSent(
    id: string,
): Promise<RosterActionResponse> {
    try {
        const session = await requireAuth();
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
            return { success: false, message: "ไม่พบรายชื่อครูนี้" };
        }

        await prisma.schoolTeacherRoster.update({
            where: { id },
            data: { inviteSent: true },
        });

        return { success: true, message: "อัปเดตสถานะสำเร็จ" };
    } catch (error) {
        console.error("markRosterInviteSent error:", error);
        return { success: false, message: "เกิดข้อผิดพลาด" };
    }
}
