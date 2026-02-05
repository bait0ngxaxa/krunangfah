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

        // Create user and teacher in transaction
        await prisma.$transaction([
            // Create user
            prisma.user.create({
                data: {
                    email: invite.email,
                    name: `${invite.firstName} ${invite.lastName}`,
                    password: hashedPassword,
                    role: invite.userRole,
                    schoolId: invite.schoolId,
                },
            }),
            // Mark invite as accepted
            prisma.teacherInvite.update({
                where: { id: invite.id },
                data: { acceptedAt: new Date() },
            }),
        ]);

        // Get created user to create teacher profile
        const user = await prisma.user.findUnique({
            where: { email: invite.email },
        });

        if (user) {
            await prisma.teacher.create({
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
        }

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
