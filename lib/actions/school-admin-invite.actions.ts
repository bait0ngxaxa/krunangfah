"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/user";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";
import { inviteRegisterSchema } from "@/lib/validations/auth.validation";
import { createRateLimiter, extractClientIp } from "@/lib/rate-limit";
import { RATE_LIMIT_AUTH_SIGNIN } from "@/lib/constants/rate-limit";
import type {
    SchoolAdminInvite,
    InviteActionResponse,
} from "@/types/school-admin-invite.types";
import type { AuthResponse } from "@/types/auth.types";

const INVITES_PATH = "/admin/invites";

// Rate limiter: 5 invite-accept attempts per 15min per IP (reuse signin config)
const inviteAcceptLimiter = createRateLimiter(RATE_LIMIT_AUTH_SIGNIN);

const emailSchema = z.string().email("อีเมลไม่ถูกต้อง");

/**
 * สร้าง invite link สำหรับ school_admin (system_admin only)
 */
export async function createSchoolAdminInvite(
    email: string,
): Promise<InviteActionResponse> {
    try {
        const session = await requireAdmin();

        // Validate email
        const parsedEmail = emailSchema.safeParse(email);
        if (!parsedEmail.success) {
            return { success: false, message: "อีเมลไม่ถูกต้อง" };
        }

        const normalizedEmail = parsedEmail.data.toLowerCase().trim();

        // Check if email already has a user account
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (existingUser) {
            return {
                success: false,
                message: "อีเมลนี้มีบัญชีผู้ใช้งานอยู่แล้ว",
            };
        }

        // Check if there is already a pending invite for this email
        const existingInvite = await prisma.schoolAdminInvite.findFirst({
            where: {
                email: normalizedEmail,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
        if (existingInvite) {
            return {
                success: false,
                message: "มีคำเชิญที่รอดำเนินการสำหรับอีเมลนี้อยู่แล้ว",
            };
        }

        // Remove any expired or used invites for this email to allow re-invite
        await prisma.schoolAdminInvite.deleteMany({
            where: { email: normalizedEmail },
        });

        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.schoolAdminInvite.create({
            data: {
                token,
                email: normalizedEmail,
                expiresAt,
                createdBy: session.user.id,
            },
        });

        revalidatePath(INVITES_PATH);

        const baseUrl = process.env.NEXTAUTH_URL ?? "";
        const inviteUrl = `${baseUrl}/invite/admin/${token}`;

        return {
            success: true,
            message: "สร้างคำเชิญสำเร็จ",
            data: { inviteUrl },
        };
    } catch (error) {
        console.error("createSchoolAdminInvite error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้างคำเชิญ" };
    }
}

/**
 * ดึงรายการ invites ทั้งหมด (system_admin only)
 */
export async function getSchoolAdminInvites(): Promise<SchoolAdminInvite[]> {
    await requireAdmin();

    const invites = await prisma.schoolAdminInvite.findMany({
        include: {
            creator: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return invites;
}

/**
 * ยกเลิกคำเชิญที่ยังไม่ได้ใช้ (system_admin only)
 */
export async function revokeSchoolAdminInvite(
    id: string,
): Promise<InviteActionResponse> {
    try {
        await requireAdmin();

        const invite = await prisma.schoolAdminInvite.findUnique({
            where: { id },
        });

        if (!invite) {
            return { success: false, message: "ไม่พบคำเชิญที่ต้องการยกเลิก" };
        }

        if (invite.usedAt !== null) {
            return {
                success: false,
                message: "ไม่สามารถยกเลิกคำเชิญที่ถูกใช้งานแล้ว",
            };
        }

        await prisma.schoolAdminInvite.delete({ where: { id } });

        revalidatePath(INVITES_PATH);

        return { success: true, message: "ยกเลิกคำเชิญสำเร็จ" };
    } catch (error) {
        console.error("revokeSchoolAdminInvite error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการยกเลิกคำเชิญ" };
    }
}

/**
 * Validate invite token — ส่งคืน email ถ้า valid, throw ถ้าไม่ valid
 */
export async function validateInviteToken(
    token: string,
): Promise<{ email: string }> {
    const invite = await prisma.schoolAdminInvite.findUnique({
        where: { token },
    });

    if (!invite) {
        throw new Error("ไม่พบคำเชิญ หรือลิงก์ไม่ถูกต้อง");
    }

    if (invite.usedAt !== null) {
        throw new Error("คำเชิญนี้ถูกใช้งานแล้ว");
    }

    if (invite.expiresAt < new Date()) {
        throw new Error("คำเชิญหมดอายุแล้ว");
    }

    return { email: invite.email };
}

/**
 * รับคำเชิญและสร้างบัญชี school_admin (rate limited)
 */
export async function acceptSchoolAdminInvite(
    token: string,
    password: string,
): Promise<AuthResponse> {
    // Rate limiting
    const headerStore = await headers();
    const ip = extractClientIp((name) => headerStore.get(name));
    const rateLimitResult = inviteAcceptLimiter.check(ip);

    if (!rateLimitResult.allowed) {
        const minutes = Math.ceil(rateLimitResult.retryAfterSeconds / 60);
        const timeMessage =
            minutes > 1
                ? `${minutes} นาที`
                : `${rateLimitResult.retryAfterSeconds} วินาที`;

        return {
            success: false,
            message: `ส่งคำขอมากเกินไป กรุณารอ ${timeMessage}`,
        };
    }

    // Validate token
    let inviteEmail: string;
    try {
        const result = await validateInviteToken(token);
        inviteEmail = result.email;
    } catch (error) {
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: "ลิงก์ไม่ถูกต้อง" };
    }

    // Validate password
    const parsed = inviteRegisterSchema.safeParse({
        password,
        confirmPassword: password,
    });
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message };
    }

    try {
        const hashedPassword = await hashPassword(password);

        await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: inviteEmail,
                    password: hashedPassword,
                    role: "school_admin",
                    isPrimary: true, // invited by system_admin = primary admin
                },
            });

            await tx.schoolAdminInvite.update({
                where: { token },
                data: { usedAt: new Date() },
            });

            return user;
        });

        return {
            success: true,
            message: "สร้างบัญชีสำเร็จ กรุณาเข้าสู่ระบบ",
        };
    } catch (error) {
        console.error("acceptSchoolAdminInvite error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้างบัญชี" };
    }
}
