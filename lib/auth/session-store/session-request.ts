import type { Session } from "next-auth";
import { prisma } from "@/lib/database/prisma";
import {
    deleteCachedSession,
    getCachedSession,
    getUserSessionVersion,
    setCachedSession,
    type CachedSessionPayload,
} from "@/lib/auth/session-cache";
import { persistSessionActivity, shouldPersistActivityAt } from "./session-activity";
import { getCurrentSessionToken } from "./session-cookie";
import { revokeSessionToken } from "./session-lifecycle";
import { getSessionMetadata, type HeaderGetter } from "./session-metadata";
import {
    getCachedSessionVersion,
    hasCachedSessionIdleTimedOut,
    hasSessionIdleTimedOut,
    isAccountSessionDisabled,
    isCachedSessionValid,
    isCachedSessionVersionStale,
    isSessionUnavailable,
} from "./session-policy";
import {
    createSessionPayload,
    SESSION_USER_INCLUDE,
    toSession,
} from "./session-record";
import { hashSessionToken } from "./session-token";

interface CachedSessionResolution {
    session: Session | null;
    shouldQueryDatabase: boolean;
}

interface CachedInvalidationContext {
    token: string;
    tokenHash: string;
    payload: CachedSessionPayload;
    now: Date;
    currentVersion: number;
}

export async function getCurrentSessionId(): Promise<string | null> {
    const token = await getCurrentSessionToken();
    if (!token) return null;

    const tokenHash = hashSessionToken(token);
    const cachedSession = await getCachedSession(tokenHash);
    if (cachedSession) return cachedSession.sessionId;

    const session = await prisma.userSession.findUnique({
        where: { sessionTokenHash: tokenHash },
        select: { id: true },
    });
    return session?.id ?? null;
}

export async function updateCurrentSessionMetadata(
    headerGetter: HeaderGetter,
): Promise<void> {
    const token = await getCurrentSessionToken();
    if (!token) return;

    const tokenHash = hashSessionToken(token);
    await prisma.userSession.updateMany({
        where: { sessionTokenHash: tokenHash, revokedAt: null },
        data: getSessionMetadata(headerGetter),
    });
    await deleteCachedSession(tokenHash);
}

function shouldPersistCachedActivity(
    payload: CachedSessionPayload,
    now: Date,
): boolean {
    return shouldPersistActivityAt(new Date(payload.activityPersistedAt), now);
}

async function invalidateCachedResolution(
    context: CachedInvalidationContext,
): Promise<CachedSessionResolution> {
    const { token, tokenHash, payload, now, currentVersion } = context;
    if (isCachedSessionVersionStale(payload, currentVersion)) {
        await deleteCachedSession(tokenHash);
        return { session: null, shouldQueryDatabase: true };
    }

    if (hasCachedSessionIdleTimedOut(payload, now)) {
        await revokeSessionToken(token);
    } else {
        await deleteCachedSession(tokenHash);
    }
    return { session: null, shouldQueryDatabase: false };
}

async function touchCachedSession(
    tokenHash: string,
    payload: CachedSessionPayload,
    now: Date,
    currentVersion: number,
): Promise<Session> {
    const shouldPersist = shouldPersistCachedActivity(payload, now);
    const touchedSession: CachedSessionPayload = {
        ...payload,
        sessionVersion:
            currentVersion > 0 ? currentVersion : getCachedSessionVersion(payload),
        lastActivityAt: now.toISOString(),
        activityPersistedAt: shouldPersist
            ? now.toISOString()
            : payload.activityPersistedAt,
    };
    await setCachedSession(tokenHash, touchedSession);

    if (shouldPersist) {
        await persistSessionActivity(
            payload.sessionId,
            now,
            "Session cached activity update error:",
        );
    }
    return toSession(touchedSession);
}

async function resolveCachedSession(
    token: string,
    tokenHash: string,
    payload: CachedSessionPayload,
    now: Date,
): Promise<CachedSessionResolution> {
    const currentVersion = await getUserSessionVersion(payload.user.id);
    if (!isCachedSessionValid(payload, now, currentVersion)) {
        return invalidateCachedResolution({
            token,
            tokenHash,
            payload,
            now,
            currentVersion,
        });
    }

    const session = await touchCachedSession(
        tokenHash,
        payload,
        now,
        currentVersion,
    );
    return { session, shouldQueryDatabase: false };
}

async function resolveDatabaseSession(
    token: string,
    tokenHash: string,
    now: Date,
): Promise<Session | null> {
    const session = await prisma.userSession.findUnique({
        where: { sessionTokenHash: tokenHash },
        include: SESSION_USER_INCLUDE,
    });
    if (!session || isSessionUnavailable(session, now)) return null;

    if (isAccountSessionDisabled(session.user)) {
        await revokeSessionToken(token);
        return null;
    }

    if (hasSessionIdleTimedOut(session.lastActivityAt, now)) {
        await revokeSessionToken(token);
        return null;
    }

    const shouldPersist = shouldPersistActivityAt(session.lastActivityAt, now);
    if (shouldPersist) {
        await persistSessionActivity(session.id, now, "Session activity update error:");
    }

    const sessionVersion = await getUserSessionVersion(session.user.id);
    const payload = createSessionPayload(
        session,
        now,
        sessionVersion,
        shouldPersist ? now : session.lastActivityAt,
    );
    await setCachedSession(tokenHash, payload);
    return toSession(payload);
}

async function getSessionByToken(token: string): Promise<Session | null> {
    const now = new Date();
    const tokenHash = hashSessionToken(token);
    const cachedSession = await getCachedSession(tokenHash);

    if (cachedSession) {
        const cached = await resolveCachedSession(
            token,
            tokenHash,
            cachedSession,
            now,
        );
        if (!cached.shouldQueryDatabase) return cached.session;
    }

    return resolveDatabaseSession(token, tokenHash, now);
}

export async function getRequestSession(): Promise<Session | null> {
    const token = await getCurrentSessionToken();
    return token ? getSessionByToken(token) : null;
}
