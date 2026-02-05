"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import type { InviteResponse, InviteListResponse } from "./types";

/**
 * ดึงข้อมูล invite จาก token
 */
export async function getTeacherInvite(token: string): Promise<InviteResponse> {
    try {
        const invite = await prisma.teacherInvite.findUnique({
            where: { token },
            include: {
                school: true,
                academicYear: true,
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

        return { success: true, message: "พบคำเชิญ", invite };
    } catch (error) {
        console.error("Get teacher invite error:", error);
        return { success: false, message: "เกิดข้อผิดพลาด" };
    }
}

/**
 * ดึงรายการ invites ทั้งหมดที่สร้างโดย user
 */
export async function getMyTeacherInvites(): Promise<InviteListResponse> {
    try {
        const session = await requireAuth();

        const invites = await prisma.teacherInvite.findMany({
            where: { invitedById: session.user.id },
            include: {
                academicYear: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return { success: true, invites };
    } catch (error) {
        console.error("Get my teacher invites error:", error);
        return { success: false, invites: [] };
    }
}
