"use server";

import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import { canViewTeacherInvites } from "@/lib/auth/teacher-management-policy";
import { hashToken } from "@/lib/auth/token";
import type {
    InviteResponse,
    TeacherInviteWithAcademicYear,
} from "./types";
import { handleActionError, handleQueryError } from "../error-handler";
import {
    queryEmpty,
    queryForbidden,
    querySuccess,
    type QueryResult,
} from "../query-result";

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
export async function getMyTeacherInvites(): Promise<
    QueryResult<TeacherInviteWithAcademicYear[]>
> {
    try {
        const session = await requireAuth();
        if (!canViewTeacherInvites(session.user)) {
            return queryForbidden("ไม่มีสิทธิ์ดูคำเชิญครู");
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
            return queryEmpty([]);
        }

        const invites = await prisma.teacherInvite.findMany({
            where: { schoolId },
            orderBy: { createdAt: "desc" },
        });

        const sanitizedInvites = invites.map((invite) => ({
            ...invite,
            token: "",
        }));
        return sanitizedInvites.length === 0
            ? queryEmpty(sanitizedInvites)
            : querySuccess(sanitizedInvites);
    } catch (error) {
        return handleQueryError("Get school teacher invites error:", error);
    }
}
