"use server";

import { prisma } from "@/lib/database/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { generateInviteToken, hashToken } from "@/lib/auth/token";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { inviteRoleSchema } from "@/lib/validations/auth.validation";
import type {
    SchoolAdminInvite,
    InviteActionResponse,
    InviteRole,
} from "@/types/school-admin-invite.types";
import type { AuthResponse } from "@/types/auth.types";
import { handleActionError } from "./error-handler";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";
import {
    acceptInvite,
    type AcceptedInviteContext,
    type InviteAcceptanceResponse,
} from "@/lib/services/invite-acceptance.service";

const INVITES_PATH = "/admin/invites";

const emailSchema = z.string().email("อีเมลไม่ถูกต้อง");

/**
 * สร้าง invite link สำหรับ admin (system_admin only)
 * @param email - อีเมลผู้รับเชิญ
 * @param role - บทบาทที่ต้องการ: "system_admin" หรือ "school_admin"
 */
export async function createSchoolAdminInvite(
    email: string,
    role: InviteRole = "school_admin",
): Promise<InviteActionResponse> {
    try {
        const session = await requireAdmin();

        // Validate email
        const parsedEmail = emailSchema.safeParse(email);
        if (!parsedEmail.success) {
            return { success: false, message: "อีเมลไม่ถูกต้อง" };
        }

        // Validate role
        const parsedRole = inviteRoleSchema.safeParse(role);
        if (!parsedRole.success) {
            return { success: false, message: "บทบาทไม่ถูกต้อง" };
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

        const token = generateInviteToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.schoolAdminInvite.create({
            data: {
                token: tokenHash,
                email: normalizedEmail,
                role: parsedRole.data,
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
        return handleActionError({
            context: "createSchoolAdminInvite error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการสร้างคำเชิญ",
            },
        });
    }
}

/**
 * ดึงรายการ invites ทั้งหมด (system_admin only)
 */
export async function getSchoolAdminInvites(): Promise<SchoolAdminInvite[]> {
    await requireAdmin();

    const invites = await prisma.schoolAdminInvite.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            usedAt: true,
            expiresAt: true,
            createdAt: true,
            creator: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role as InviteRole,
        usedAt: inv.usedAt,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        creator: inv.creator,
    }));
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
        return handleActionError({
            context: "revokeSchoolAdminInvite error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการยกเลิกคำเชิญ",
            },
        });
    }
}

/**
 * Validate invite token — ส่งคืน email + role ถ้า valid, throw ถ้าไม่ valid
 */
export async function validateInviteToken(
    token: string,
): Promise<{ email: string; role: InviteRole }> {
    const tokenHash = hashToken(token);
    const invite = await prisma.schoolAdminInvite.findUnique({
        where: { token: tokenHash },
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

    return { email: invite.email, role: invite.role as InviteRole };
}

async function checkSchoolAdminInviteToken(
    tokenHash: string,
    now: Date,
): Promise<InviteAcceptanceResponse | null> {
    const invite = await prisma.schoolAdminInvite.findUnique({
        where: { token: tokenHash },
        select: { usedAt: true, expiresAt: true },
    });
    if (!invite) {
        return { success: false, message: "ไม่พบคำเชิญ หรือลิงก์ไม่ถูกต้อง" };
    }
    if (invite.usedAt !== null) {
        return { success: false, message: "คำเชิญนี้ถูกใช้งานแล้ว" };
    }
    if (invite.expiresAt <= now) {
        return { success: false, message: "คำเชิญหมดอายุแล้ว" };
    }
    return null;
}

async function acceptClaimedSchoolAdminInvite(
    context: AcceptedInviteContext,
): Promise<AuthResponse> {
    return runSerializableTransaction(async (tx) => {
            const usedAt = new Date();
            const claimResult = await tx.schoolAdminInvite.updateMany({
                where: {
                    token: context.tokenHash,
                    usedAt: null,
                    expiresAt: { gt: usedAt },
                },
                data: { usedAt },
            });

            if (claimResult.count === 0) {
                const inviteState = await tx.schoolAdminInvite.findUnique({
                    where: { token: context.tokenHash },
                    select: {
                        id: true,
                        usedAt: true,
                        expiresAt: true,
                    },
                });

                if (!inviteState) {
                    return {
                        success: false,
                        message: "ไม่พบคำเชิญ หรือลิงก์ไม่ถูกต้อง",
                    } satisfies AuthResponse;
                }

                if (inviteState.usedAt !== null) {
                    return {
                        success: false,
                        message: "คำเชิญนี้ถูกใช้งานแล้ว",
                    } satisfies AuthResponse;
                }

                return {
                    success: false,
                    message: "คำเชิญหมดอายุแล้ว",
                } satisfies AuthResponse;
            }

            const invite = await tx.schoolAdminInvite.findUnique({
                where: { token: context.tokenHash },
                select: {
                    email: true,
                    role: true,
                },
            });

            if (!invite) {
                return {
                    success: false,
                    message: "ไม่พบคำเชิญ หรือลิงก์ไม่ถูกต้อง",
                } satisfies AuthResponse;
            }

            const inviteRole = invite.role as InviteRole;
            await tx.user.create({
                data: {
                    email: invite.email,
                    password: context.hashedPassword,
                    role: inviteRole,
                    isPrimary: inviteRole === "school_admin",
                },
            });

            // system_admin: เพิ่มเข้า whitelist เพื่อให้ auto-promote ทำงาน
            if (inviteRole === "system_admin") {
                await tx.systemAdminWhitelist.upsert({
                    where: { email: invite.email },
                    update: { isActive: true },
                    create: { email: invite.email },
                });
            }

            // กำหนด redirect ตาม role
            const redirectTo =
                inviteRole === "system_admin" ? "/dashboard" : "/teacher-profile";

            return {
                success: true,
                message: "สร้างบัญชีสำเร็จ กรุณาเข้าสู่ระบบ",
                redirectTo,
            } satisfies AuthResponse;
        });
}

/**
 * รับคำเชิญและสร้างบัญชี school_admin (rate limited)
 */
export async function acceptSchoolAdminInvite(
    token: string,
    password: string,
): Promise<AuthResponse> {
    try {
        return await acceptInvite({
            token,
            password,
            checkToken: checkSchoolAdminInviteToken,
            accept: acceptClaimedSchoolAdminInvite,
        });
    } catch (error) {
        return handleActionError({
            context: "acceptSchoolAdminInvite error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการสร้างบัญชี",
            },
        });
    }
}
