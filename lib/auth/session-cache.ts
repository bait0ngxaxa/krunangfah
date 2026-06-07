import type { ExtendedUser } from "@/types/auth.types";
import { getRedisClient } from "@/lib/redis";
import { logError } from "@/lib/utils/logging";

const SESSION_CACHE_PREFIX = "session";
const USER_SESSION_CACHE_PREFIX = "user-session-cache";
const SESSION_CACHE_TTL_SECONDS = 5 * 60;

export interface CachedSessionPayload {
    sessionId: string;
    user: ExtendedUser;
    expiresAt: string;
    lastActivityAt: string;
    activityPersistedAt: string;
}

function createSessionCacheKey(tokenHash: string): string {
    return `${SESSION_CACHE_PREFIX}:${tokenHash}`;
}

function createUserSessionCacheKey(userId: string): string {
    return `${USER_SESSION_CACHE_PREFIX}:${userId}`;
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
            lastActivityAt,
            activityPersistedAt,
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

        return {
            sessionId,
            user: cachedUser,
            expiresAt,
            lastActivityAt,
            activityPersistedAt,
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
