"use server";

import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import { canViewTeacherInvites } from "@/lib/auth/teacher-management-policy";
import { hashToken } from "@/lib/auth/token";
import type { InviteResponse, InviteListResponse } from "./types";
import { handleActionError } from "../error-handler";

/**
 * ดึงข้อมูล invite จาก token
 */
export async function getTeacherInvite(token: string): Promise<InviteResponse> {
    try {
        const tokenHash = hashToken(token);
        const invite = await prisma.teacherInvite.findUnique({
            where: { token: tokenHash },
            include: {
                school: true,
            },
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

        return {
            success: true,
            message: "พบคำเชิญ",
            invite: { ...invite, token: "" },
        };
    } catch (error) {
        return handleActionError({
            context: "Get teacher invite error:",
            error,
            fallback: { success: false, message: "เกิดข้อผิดพลาด" },
        });
    }
}

/**
 * ดึงรายการ invites ทั้งหมดของโรงเรียน
 */
export async function getMyTeacherInvites(): Promise<InviteListResponse> {
    try {
        const session = await requireAuth();
        if (!canViewTeacherInvites(session.user)) {
            return { success: false, invites: [] };
        }

        // Fallback to DB when schoolId was just created in onboarding.
        const schoolId =
            session.user.schoolId ??
            (
                await prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: { schoolId: true },
                })
            )?.schoolId;

        if (!schoolId) {
            return { success: true, invites: [] };
        }

        const invites = await prisma.teacherInvite.findMany({
            where: { schoolId },
            orderBy: { createdAt: "desc" },
        });

        return {
            success: true,
            invites: invites.map((invite) => ({ ...invite, token: "" })),
        };
    } catch (error) {
        return handleActionError({
            context: "Get school teacher invites error:",
            error,
            fallback: { success: false, invites: [] },
        });
    }
}
