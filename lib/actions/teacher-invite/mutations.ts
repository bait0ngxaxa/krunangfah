"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { hashPassword } from "@/lib/user";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type { TeacherInviteFormData } from "@/lib/validations/teacher-invite.validation";
import type { InviteResponse } from "./types";

/**
 * สร้าง invite สำหรับครูผู้ดูแล
 */
export async function createTeacherInvite(
    input: TeacherInviteFormData,
): Promise<InviteResponse> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        // Only primary school_admin or system_admin can create invites
        if (
            session.user.role === "system_admin" ||
            (session.user.role === "school_admin" && session.user.isPrimary)
        ) {
            // OK
        } else {
            return {
                success: false,
                message: "ไม่มีสิทธิ์สร้างคำเชิญ",
            };
        }

        // Get user's schoolId
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true },
        });

        if (!user?.schoolId) {
            return {
                success: false,
                message: "คุณยังไม่ได้เชื่อมต่อกับโรงเรียน",
            };
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: input.email },
        });

        if (existingUser) {
            return {
                success: false,
                message: "อีเมลนี้มีผู้ใช้งานแล้ว",
            };
        }

        // Check if pending invite exists
        const existingInvite = await prisma.teacherInvite.findFirst({
            where: {
                email: input.email,
                acceptedAt: null,
                expiresAt: { gt: new Date() },
            },
        });

        if (existingInvite) {
            return {
                success: false,
                message: "มีคำเชิญที่รอดำเนินการสำหรับอีเมลนี้แล้ว",
            };
        }

        // Generate token
        const token = randomBytes(32).toString("hex");

        // Set expiry to 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invite
        const invite = await prisma.teacherInvite.create({
            data: {
                token,
                email: input.email,
                firstName: input.firstName,
                lastName: input.lastName,
                age: Number(input.age), // Convert string to number
                userRole: input.userRole,
                advisoryClass: normalizeClassName(input.advisoryClass),
                academicYearId: input.academicYearId,
                schoolId: user.schoolId,
                schoolRole: input.schoolRole,
                projectRole: input.projectRole,
                invitedById: userId,
                expiresAt,
            },
            include: {
                school: true,
                academicYear: true,
            },
        });

        const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${token}`;

        revalidatePath("/teachers/add");

        return {
            success: true,
            message: "สร้างคำเชิญสำเร็จ",
            invite,
            inviteLink,
        };
    } catch (error) {
        console.error("Create teacher invite error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการสร้างคำเชิญ",
        };
    }
}

/**
 * ยอมรับคำเชิญและสร้าง account
 */
export async function acceptTeacherInvite(
    token: string,
    password: string,
): Promise<InviteResponse> {
    try {
        // Get invite
        const invite = await prisma.teacherInvite.findUnique({
            where: { token },
        });

        if (!invite) {
            return { success: false, message: "ไม่พบคำเชิญ" };
        }

        if (invite.acceptedAt) {
            return { success: false, message: "คำเชิญนี้ถูกใช้งานแล้ว" };
        }

        if (invite.expiresAt < new Date()) {
            return { success: false, message: "คำเชิญหมดอายุแล้ว" };
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user, teacher profile, and mark invite — all in one transaction
        await prisma.$transaction(async (tx) => {
            // 1. Create user
            const user = await tx.user.create({
                data: {
                    email: invite.email,
                    name: `${invite.firstName} ${invite.lastName}`,
                    password: hashedPassword,
                    role: invite.userRole,
                    schoolId: invite.schoolId,
                },
            });

            // 2. Create teacher profile
            await tx.teacher.create({
                data: {
                    userId: user.id,
                    firstName: invite.firstName,
                    lastName: invite.lastName,
                    age: invite.age,
                    advisoryClass: invite.advisoryClass,
                    academicYearId: invite.academicYearId,
                    schoolRole: invite.schoolRole,
                    projectRole: invite.projectRole,
                },
            });

            // 3. Mark invite as accepted
            await tx.teacherInvite.update({
                where: { id: invite.id },
                data: { acceptedAt: new Date() },
            });
        });

        return {
            success: true,
            message: "ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ",
        };
    } catch (error) {
        console.error("Accept teacher invite error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการลงทะเบียน",
        };
    }
}

/**
 * ยกเลิกคำเชิญครู (ลบออก)
 * primary school_admin สามารถยกเลิก invite ของโรงเรียนตัวเอง
 * system_admin สามารถยกเลิก invite ไหนก็ได้
 */
export async function revokeTeacherInvite(
    inviteId: string,
): Promise<InviteResponse> {
    try {
        const session = await requireAuth();

        const invite = await prisma.teacherInvite.findUnique({
            where: { id: inviteId },
            select: {
                id: true,
                email: true,
                acceptedAt: true,
                schoolId: true,
            },
        });

        if (!invite) {
            return { success: false, message: "ไม่พบคำเชิญ" };
        }

        if (invite.acceptedAt) {
            return { success: false, message: "คำเชิญนี้ถูกใช้งานแล้ว ไม่สามารถยกเลิกได้" };
        }

        // Access control: system_admin can revoke any, primary school_admin can revoke own school's
        const isSystemAdmin = session.user.role === "system_admin";
        const isPrimaryOfSchool =
            session.user.role === "school_admin" &&
            session.user.isPrimary &&
            session.user.schoolId === invite.schoolId;

        if (!isSystemAdmin && !isPrimaryOfSchool) {
            return { success: false, message: "ไม่มีสิทธิ์ยกเลิกคำเชิญ" };
        }

        await prisma.teacherInvite.delete({
            where: { id: inviteId },
        });

        revalidatePath("/teachers/add");

        return {
            success: true,
            message: `ยกเลิกคำเชิญสำหรับ "${invite.email}" สำเร็จ`,
        };
    } catch (error) {
        console.error("Revoke teacher invite error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการยกเลิกคำเชิญ",
        };
    }
}
