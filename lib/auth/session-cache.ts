import type { ExtendedUser } from "@/types/auth.types";
import { getRedisClient } from "@/lib/cache/redis";
import { logError } from "@/lib/utils/logging";

const SESSION_CACHE_PREFIX = "session";
const USER_SESSION_CACHE_PREFIX = "user-session-cache";
const SESSION_VERSION_PREFIX = "session-version";
const SESSION_CACHE_TTL_SECONDS = 5 * 60;

export interface CachedSessionPayload {
    sessionId: string;
    user: ExtendedUser;
    expiresAt: string;
    revokedAt: string | null;
    lastActivityAt: string;
    activityPersistedAt: string;
    /** Snapshot of the user's session-revocation version when cached. */
    sessionVersion: number;
}

function createSessionCacheKey(tokenHash: string): string {
    return `${SESSION_CACHE_PREFIX}:${tokenHash}`;
}

function createUserSessionCacheKey(userId: string): string {
    return `${USER_SESSION_CACHE_PREFIX}:${userId}`;
}

function createSessionVersionKey(userId: string): string {
    return `${SESSION_VERSION_PREFIX}:${userId}`;
}

/**
 * Bump a user's session-revocation version. Any cached session whose
 * snapshot version is older becomes invalid on the next read, so a revoke
 * that forgot to drop the cache cannot keep serving a dead session.
 *
 * @returns The new version number (Redis unavailable → 0, no-op).
 */
export async function bumpUserSessionVersion(
    userId: string,
): Promise<number> {
    const client = await getRedisClient();
    if (!client) {
        return 0;
    }

    try {
        // INCR creates the key at 1 on first bump; set a TTL so the key
        // does not accumulate forever for dormant users.
        const next = await client.incr(createSessionVersionKey(userId));
        await client.expire(
            createSessionVersionKey(userId),
            SESSION_CACHE_TTL_SECONDS * 2,
        );
        return next;
    } catch (error) {
        logError("Session version bump error:", error);
        return 0;
    }
}

/**
 * Read a user's current session-revocation version.
 * @returns The version number (Redis unavailable → 0, treated as "no check").
 */
export async function getUserSessionVersion(
    userId: string,
): Promise<number> {
    const client = await getRedisClient();
    if (!client) {
        return 0;
    }

    try {
        const raw = await client.get(createSessionVersionKey(userId));
        if (raw === null) {
            return 0;
        }
        const parsedVersion = Number(raw);
        return Number.isFinite(parsedVersion) ? parsedVersion : 0;
    } catch (error) {
        logError("Session version read error:", error);
        return 0;
    }
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptionalDate(value: unknown): Date | null | undefined {
    if (value === null || value === undefined) {
        return value === null ? null : undefined;
    }
    if (typeof value !== "string") {
        return undefined;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseCachedUser(value: unknown): ExtendedUser | null {
    if (!isStringRecord(value)) {
        return null;
    }

    const {
        id,
        email,
        name,
        image,
        role,
        isPrimary,
        schoolId,
        emailVerified,
        createdAt,
        updatedAt,
    } = value;

    if (
        typeof id !== "string" ||
        (email !== null && typeof email !== "string") ||
        (name !== null && typeof name !== "string") ||
        (image !== null && typeof image !== "string") ||
        (role !== "school_admin" &&
            role !== "system_admin" &&
            role !== "class_teacher")
    ) {
        return null;
    }

    const parsedEmailVerified = parseOptionalDate(emailVerified);
    const parsedCreatedAt = parseOptionalDate(createdAt);
    const parsedUpdatedAt = parseOptionalDate(updatedAt);

    if (
        parsedEmailVerified === undefined ||
        parsedCreatedAt === undefined ||
        parsedCreatedAt === null ||
        parsedUpdatedAt === undefined ||
        parsedUpdatedAt === null ||
        (isPrimary !== undefined && typeof isPrimary !== "boolean") ||
        (schoolId !== undefined && schoolId !== null && typeof schoolId !== "string")
    ) {
        return null;
    }

    return {
        id,
        email,
        name,
        image,
        role,
        isPrimary,
        schoolId,
        emailVerified: parsedEmailVerified,
        createdAt: parsedCreatedAt,
        updatedAt: parsedUpdatedAt,
    };
}

function parseCachedSession(value: string): CachedSessionPayload | null {
    try {
        const parsed: unknown = JSON.parse(value);
        if (!isStringRecord(parsed)) {
            return null;
        }

        const {
            sessionId,
            user,
            expiresAt,
            revokedAt,
            lastActivityAt,
            activityPersistedAt,
            sessionVersion,
        } = parsed;

        if (
            typeof sessionId !== "string" ||
            typeof expiresAt !== "string" ||
            typeof lastActivityAt !== "string" ||
            typeof activityPersistedAt !== "string"
        ) {
            return null;
        }

        const cachedUser = parseCachedUser(user);
        if (!cachedUser) {
            return null;
        }

        const parsedRevokedAt = parseOptionalDate(revokedAt ?? null);
        if (parsedRevokedAt === undefined) {
            return null;
        }

        // Backward-compat: caches written before the version field existed
        // (or with it absent) default to 0 — treated as "no version check".
        const parsedVersion =
            typeof sessionVersion === "number" &&
            Number.isFinite(sessionVersion)
                ? sessionVersion
                : 0;

        return {
            sessionId,
            user: cachedUser,
            expiresAt,
            revokedAt: parsedRevokedAt?.toISOString() ?? null,
            lastActivityAt,
            activityPersistedAt,
            sessionVersion: parsedVersion,
        };
    } catch (error) {
        logError("Session cache parse error:", error);
        return null;
    }
}

function getCacheTtlSeconds(expiresAt: Date): number {
    const secondsUntilExpiry = Math.ceil(
        (expiresAt.getTime() - Date.now()) / 1000,
    );
    return Math.min(SESSION_CACHE_TTL_SECONDS, Math.max(secondsUntilExpiry, 0));
}

export async function getCachedSession(
    tokenHash: string,
): Promise<CachedSessionPayload | null> {
    const client = await getRedisClient();
    if (!client) {
        return null;
    }

    try {
        const cached = await client.get(createSessionCacheKey(tokenHash));
        return cached ? parseCachedSession(cached) : null;
    } catch (error) {
        logError("Session cache read error:", error);
        return null;
    }
}

export async function setCachedSession(
    tokenHash: string,
    payload: CachedSessionPayload,
): Promise<void> {
    const client = await getRedisClient();
    if (!client) {
        return;
    }

    const ttlSeconds = getCacheTtlSeconds(new Date(payload.expiresAt));
    if (ttlSeconds <= 0) {
        return;
    }

    try {
        await client.setEx(
            createSessionCacheKey(tokenHash),
            ttlSeconds,
            JSON.stringify(payload),
        );
        await client.sAdd(createUserSessionCacheKey(payload.user.id), tokenHash);
        await client.expire(
            createUserSessionCacheKey(payload.user.id),
            ttlSeconds,
        );
    } catch (error) {
        logError("Session cache write error:", error);
    }
}

export async function deleteCachedSession(tokenHash: string): Promise<void> {
    const client = await getRedisClient();
    if (!client) {
        return;
    }

    try {
        await client.del(createSessionCacheKey(tokenHash));
    } catch (error) {
        logError("Session cache delete error:", error);
    }
}

export async function deleteUserSessionCaches(userId: string): Promise<void> {
    const client = await getRedisClient();
    if (!client) {
        return;
    }

    const userCacheKey = createUserSessionCacheKey(userId);
    try {
        const tokenHashes = await client.sMembers(userCacheKey);
        if (tokenHashes.length > 0) {
            const cacheKeys = tokenHashes.map(createSessionCacheKey);
            await client.del(cacheKeys);
        }
        await client.del(userCacheKey);
    } catch (error) {
        logError("User session cache delete error:", error);
    }
}
