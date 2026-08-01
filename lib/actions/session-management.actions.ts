"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import {
    revokeOtherUserSessions,
    revokeUserSessionById,
    updateCurrentSessionMetadata,
} from "@/lib/auth/session-store";
import { handleActionError, handleQueryError } from "./error-handler";
import { queryEmpty, querySuccess, type QueryResult } from "./query-result";
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

async function getMyManagedSessions(): Promise<ManagedSession[]> {
    const session = await requireAuth();
    const currentSessionId = session.sessionId ?? null;
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

    return sessions.map((item) => toManagedSession(item, currentSessionId));
}

export async function listMySessions(): Promise<
    QueryResult<ManagedSession[]>
> {
    try {
        const sessions = await getMyManagedSessions();
        return sessions.length === 0
            ? queryEmpty(sessions)
            : querySuccess(sessions);
    } catch (error) {
        return handleQueryError("List sessions error:", error);
    }
}

export async function revokeSessionById(
    sessionId: string,
): Promise<SessionManagementResponse> {
    try {
        const parsedSessionId = sessionIdSchema.parse(sessionId);
        const session = await requireAuth();
        const currentSessionId = session.sessionId ?? null;

        if (parsedSessionId === currentSessionId) {
            return {
                success: false,
                message: "ไม่สามารถออกจากระบบ session ปัจจุบันจากหน้านี้ได้",
                sessions: await getMyManagedSessions(),
            };
        }

        await revokeUserSessionById(session.user.id, parsedSessionId);

        const sessions = await getMyManagedSessions();
        return {
            success: true,
            message: "ออกจากระบบอุปกรณ์ที่เลือกแล้ว",
            sessions,
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
        const currentSessionId = session.sessionId ?? null;

        await revokeOtherUserSessions(session.user.id, currentSessionId);

        const sessions = await getMyManagedSessions();
        return {
            success: true,
            message: "ออกจากระบบอุปกรณ์อื่นทั้งหมดแล้ว",
            sessions,
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
