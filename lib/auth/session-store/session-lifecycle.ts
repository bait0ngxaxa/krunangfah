import { prisma } from "@/lib/database/prisma";
import {
    bumpUserSessionVersion,
    deleteCachedSession,
    deleteUserSessionCaches,
} from "@/lib/auth/session-cache";
import {
    getCurrentSessionToken,
    getSessionCookieMaxAge,
} from "./session-cookie";
import {
    isAccountSessionDisabled,
    isSessionUnavailable,
} from "./session-policy";
import { createSessionToken, hashSessionToken } from "./session-token";

const SESSION_ROTATE_AFTER_MS = 6 * 60 * 60 * 1000;

interface RotatedSessionToken {
    token: string;
    maxAgeSeconds: number;
}

interface RotationCandidate {
    id: string;
    expiresAt: Date;
    revokedAt: Date | null;
    tokenRotatedAt: Date;
    user: {
        deletedAt: Date | null;
        role: string;
        school: { disabledAt: Date | null } | null;
    };
}

export async function revokeSessionToken(token: string): Promise<void> {
    const tokenHash = hashSessionToken(token);
    await prisma.userSession.updateMany({
        where: { sessionTokenHash: tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    await deleteCachedSession(tokenHash);
}

export async function invalidateUserSessionCaches(
    userId: string,
): Promise<void> {
    await Promise.all([
        bumpUserSessionVersion(userId),
        deleteUserSessionCaches(userId),
    ]);
}

export async function revokeUserSessions(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    await invalidateUserSessionCaches(userId);
}

export async function revokeUserSessionById(
    userId: string,
    sessionId: string,
): Promise<void> {
    await prisma.userSession.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    await invalidateUserSessionCaches(userId);
}

export async function revokeOtherUserSessions(
    userId: string,
    currentSessionId: string | null,
): Promise<void> {
    await prisma.userSession.updateMany({
        where: {
            userId,
            revokedAt: null,
            id: currentSessionId ? { not: currentSessionId } : undefined,
        },
        data: { revokedAt: new Date() },
    });
    await invalidateUserSessionCaches(userId);
}

async function getRotationCandidate(
    tokenHash: string,
): Promise<RotationCandidate | null> {
    return prisma.userSession.findUnique({
        where: { sessionTokenHash: tokenHash },
        select: {
            id: true,
            expiresAt: true,
            revokedAt: true,
            tokenRotatedAt: true,
            user: {
                select: {
                    deletedAt: true,
                    role: true,
                    school: { select: { disabledAt: true } },
                },
            },
        },
    });
}

async function rotateSession(
    session: RotationCandidate,
    previousTokenHash: string,
    now: Date,
): Promise<RotatedSessionToken> {
    const token = createSessionToken();
    await prisma.userSession.update({
        where: { id: session.id },
        data: {
            sessionTokenHash: hashSessionToken(token),
            tokenRotatedAt: now,
            lastActivityAt: now,
        },
    });
    await deleteCachedSession(previousTokenHash);

    return {
        token,
        maxAgeSeconds: getSessionCookieMaxAge(session.expiresAt),
    };
}

export async function rotateCurrentSessionToken(): Promise<RotatedSessionToken | null> {
    const token = await getCurrentSessionToken();
    if (!token) return null;

    const now = new Date();
    const tokenHash = hashSessionToken(token);
    const session = await getRotationCandidate(tokenHash);
    if (!session || isSessionUnavailable(session, now)) return null;

    if (isAccountSessionDisabled(session.user)) {
        await revokeSessionToken(token);
        return null;
    }

    const elapsed = now.getTime() - session.tokenRotatedAt.getTime();
    if (elapsed < SESSION_ROTATE_AFTER_MS) return null;

    return rotateSession(session, tokenHash, now);
}
