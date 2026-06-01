"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
    getCurrentSessionId,
    updateCurrentSessionMetadata,
} from "@/lib/auth/session-store";
import { handleActionError } from "./error-handler";
import type {
    ManagedSession,
    SessionManagementResponse,
} from "@/types/profile.types";

const sessionIdSchema = z.string().min(1);

function toManagedSession(
    session: {
        id: string;
        createdAt: Date;
        expiresAt: Date;
        lastActivityAt: Date;
        userAgentLabel: string | null;
        lastIpPrefix: string | null;
    },
    currentSessionId: string | null,
): ManagedSession {
    return {
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
        userAgentLabel: session.userAgentLabel ?? "อุปกรณ์ไม่ทราบชนิด",
        lastIpPrefix: session.lastIpPrefix,
        isCurrent: session.id === currentSessionId,
    };
}

export async function listMySessions(): Promise<SessionManagementResponse> {
    try {
        const session = await requireAuth();
        const currentSessionId = await getCurrentSessionId();
        const headerStore = await headers();
        await updateCurrentSessionMetadata((name) => headerStore.get(name));
        const now = new Date();
        const sessions = await prisma.userSession.findMany({
            where: {
                userId: session.user.id,
                revokedAt: null,
                expiresAt: { gt: now },
            },
            orderBy: { lastActivityAt: "desc" },
            select: {
                id: true,
                createdAt: true,
                expiresAt: true,
                lastActivityAt: true,
                userAgentLabel: true,
                lastIpPrefix: true,
            },
        });

        return {
            success: true,
            message: "โหลด session สำเร็จ",
            sessions: sessions.map((item) =>
                toManagedSession(item, currentSessionId),
            ),
        };
    } catch (error) {
        return handleActionError({
            context: "List sessions error:",
            error,
            fallback: {
                success: false,
                message: "ไม่สามารถโหลด session ได้",
                sessions: [],
            },
        });
    }
}

export async function revokeSessionById(
    sessionId: string,
): Promise<SessionManagementResponse> {
    try {
        const parsedSessionId = sessionIdSchema.parse(sessionId);
        const session = await requireAuth();
        const currentSessionId = await getCurrentSessionId();

        if (parsedSessionId === currentSessionId) {
            return {
                success: false,
                message: "ไม่สามารถออกจากระบบ session ปัจจุบันจากหน้านี้ได้",
                sessions: (await listMySessions()).sessions,
            };
        }

        await prisma.userSession.updateMany({
            where: {
                id: parsedSessionId,
                userId: session.user.id,
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });

        const refreshed = await listMySessions();
        return {
            ...refreshed,
            message: "ออกจากระบบอุปกรณ์ที่เลือกแล้ว",
        };
    } catch (error) {
        return handleActionError({
            context: "Revoke session error:",
            error,
            fallback: {
                success: false,
                message: "ไม่สามารถออกจากระบบอุปกรณ์นี้ได้",
                sessions: [],
            },
        });
    }
}

export async function revokeOtherSessions(): Promise<SessionManagementResponse> {
    try {
        const session = await requireAuth();
        const currentSessionId = await getCurrentSessionId();

        await prisma.userSession.updateMany({
            where: {
                userId: session.user.id,
                revokedAt: null,
                id: currentSessionId ? { not: currentSessionId } : undefined,
            },
            data: { revokedAt: new Date() },
        });

        const refreshed = await listMySessions();
        return {
            ...refreshed,
            message: "ออกจากระบบอุปกรณ์อื่นทั้งหมดแล้ว",
        };
    } catch (error) {
        return handleActionError({
            context: "Revoke other sessions error:",
            error,
            fallback: {
                success: false,
                message: "ไม่สามารถออกจากระบบอุปกรณ์อื่นได้",
                sessions: [],
            },
        });
    }
}
