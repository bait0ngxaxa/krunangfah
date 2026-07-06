import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/database/prisma";
import {
    getCurrentSessionId,
    getRequestSession,
    revokeOtherUserSessions,
    revokeSessionToken,
    revokeUserSessionById,
    revokeUserSessions,
    rotateCurrentSessionToken,
    signInWithPassword,
    updateCurrentSessionMetadata,
} from "@/lib/auth/session-store";

const mocks = vi.hoisted(() => ({
    compare: vi.fn(),
    cookies: vi.fn(),
    rateLimitCheck: vi.fn(),
    userFindUnique: vi.fn(),
    userUpdate: vi.fn(),
    whitelistFindUnique: vi.fn(),
    userSessionCreate: vi.fn(),
    userSessionFindUnique: vi.fn(),
    userSessionUpdate: vi.fn(),
    userSessionUpdateMany: vi.fn(),
    bumpUserSessionVersion: vi.fn(),
    getCachedSession: vi.fn(),
    getUserSessionVersion: vi.fn(),
    setCachedSession: vi.fn(),
    deleteCachedSession: vi.fn(),
    deleteUserSessionCaches: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
    compare: mocks.compare,
}));

vi.mock("next/headers", () => ({
    cookies: mocks.cookies,
}));

vi.mock("@/lib/rate-limit", () => ({
    createRateLimiter: vi.fn(() => ({
        check: mocks.rateLimitCheck,
        cleanup: vi.fn(),
        destroy: vi.fn(),
    })),
    extractClientIp: vi.fn(() => "203.0.113.42"),
    extractRateLimitKey: vi.fn(() => "203.0.113.42"),
    TRUSTED_PROXY_HEADERS: { trustProxyHeaders: true },
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: {
            findUnique: mocks.userFindUnique,
            update: mocks.userUpdate,
        },
        systemAdminWhitelist: {
            findUnique: mocks.whitelistFindUnique,
        },
        userSession: {
            create: mocks.userSessionCreate,
            findUnique: mocks.userSessionFindUnique,
            update: mocks.userSessionUpdate,
            updateMany: mocks.userSessionUpdateMany,
        },
    },
}));

vi.mock("@/lib/auth/session-cache", () => ({
    bumpUserSessionVersion: mocks.bumpUserSessionVersion,
    getCachedSession: mocks.getCachedSession,
    getUserSessionVersion: mocks.getUserSessionVersion,
    setCachedSession: mocks.setCachedSession,
    deleteCachedSession: mocks.deleteCachedSession,
    deleteUserSessionCaches: mocks.deleteUserSessionCaches,
}));

function createHeaderGetter(userAgent: string) {
    return (name: string): string | null =>
        name.toLowerCase() === "user-agent" ? userAgent : null;
}

function setCookieToken(token: string | null): void {
    vi.mocked(cookies).mockResolvedValue({
        get: vi.fn(() => (token ? { value: token } : undefined)),
    } as never);
}

function createDbUser() {
    return {
        id: "user-1",
        email: "teacher@example.com",
        name: "ครูทดสอบ",
        image: null,
        password: "hashed-password",
        role: "school_admin",
        isPrimary: true,
        schoolId: "school-1",
        deletedAt: null,
        emailVerified: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        school: { disabledAt: null },
    };
}

function createCachedUser() {
    const user = createDbUser();

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        isPrimary: user.isPrimary,
        schoolId: user.schoolId,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

describe("lib/auth/session-store", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-01T08:00:00.000Z"));
        vi.clearAllMocks();
        mocks.rateLimitCheck.mockResolvedValue({
            allowed: true,
            limit: 8,
            remaining: 7,
            resetAt: 1,
            retryAfterSeconds: 0,
        });
        mocks.bumpUserSessionVersion.mockResolvedValue(1);
        mocks.getCachedSession.mockResolvedValue(null);
        mocks.getUserSessionVersion.mockResolvedValue(0);
        mocks.setCachedSession.mockResolvedValue(undefined);
        mocks.deleteCachedSession.mockResolvedValue(undefined);
        mocks.deleteUserSessionCaches.mockResolvedValue(undefined);
    });

    it("creates a stateful session with hashed token and request metadata", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(createDbUser() as never);
        mocks.whitelistFindUnique.mockResolvedValue(null);
        vi.mocked(compare).mockResolvedValue(true as never);
        mocks.userSessionCreate.mockResolvedValue({
            id: "session-1",
            expiresAt: new Date("2026-06-02T08:00:00.000Z"),
            revokedAt: null,
            lastActivityAt: new Date("2026-06-01T08:00:00.000Z"),
            user: createDbUser(),
        });

        const result = await signInWithPassword(
            { email: "teacher@example.com", password: "password" },
            createHeaderGetter(
                "Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36",
            ),
        );

        expect(result.success).toBe(true);
        expect(mocks.userSessionCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: "user-1",
                userAgentLabel: "Chrome บนคอมพิวเตอร์",
                userAgentHash: expect.any(String),
                lastIpPrefix: "203.0.113.0/24",
            }),
            include: {
                user: {
                    include: { school: { select: { disabledAt: true } } },
                },
            },
        });
        const data = mocks.userSessionCreate.mock.calls[0][0].data;
        expect(data.sessionTokenHash).toHaveLength(64);
        if (result.success) {
            expect(data.sessionTokenHash).not.toBe(result.token);
        }
        expect(mocks.setCachedSession).toHaveBeenCalledWith(
            data.sessionTokenHash,
            expect.objectContaining({
                sessionId: "session-1",
                user: expect.objectContaining({ id: "user-1" }),
                expiresAt: "2026-06-02T08:00:00.000Z",
            }),
        );
    });

    it("does not create a session when password is invalid", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(createDbUser() as never);
        vi.mocked(compare).mockResolvedValue(false as never);

        const result = await signInWithPassword(
            { email: "teacher@example.com", password: "wrong" },
            createHeaderGetter("Mozilla/5.0"),
        );

        expect(result).toMatchObject({
            success: false,
            message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        });
        expect(mocks.userSessionCreate).not.toHaveBeenCalled();
    });

    it("returns a session and touches lastActivityAt for valid tokens", async () => {
        setCookieToken("session-token");
        mocks.userSessionFindUnique.mockResolvedValue({
            id: "session-1",
            expiresAt: new Date("2026-06-01T20:00:00.000Z"),
            revokedAt: null,
            lastActivityAt: new Date("2026-06-01T07:00:00.000Z"),
            user: createDbUser(),
        });
        mocks.userSessionUpdate.mockResolvedValue({ id: "session-1" });

        const session = await getRequestSession();

        expect(session?.user.id).toBe("user-1");
        expect(session?.sessionId).toBe("session-1");
        expect(mocks.userSessionUpdateMany).toHaveBeenCalledWith({
            where: {
                id: "session-1",
                lastActivityAt: {
                    lte: new Date("2026-06-01T07:59:00.000Z"),
                },
            },
            data: { lastActivityAt: new Date("2026-06-01T08:00:00.000Z") },
        });
        expect(mocks.setCachedSession).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                sessionId: "session-1",
                user: expect.objectContaining({ id: "user-1" }),
                lastActivityAt: "2026-06-01T08:00:00.000Z",
                activityPersistedAt: "2026-06-01T08:00:00.000Z",
            }),
        );
    });

    it("hydrates the cache without touching recent database activity", async () => {
        setCookieToken("recent-token");
        mocks.userSessionFindUnique.mockResolvedValue({
            id: "session-1",
            expiresAt: new Date("2026-06-01T20:00:00.000Z"),
            revokedAt: null,
            lastActivityAt: new Date("2026-06-01T07:59:30.000Z"),
            user: createDbUser(),
        });

        const session = await getRequestSession();

        expect(session?.sessionId).toBe("session-1");
        expect(mocks.userSessionUpdateMany).not.toHaveBeenCalled();
        expect(mocks.setCachedSession).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                lastActivityAt: "2026-06-01T08:00:00.000Z",
                activityPersistedAt: "2026-06-01T07:59:30.000Z",
            }),
        );
    });

    it("returns cached sessions without reading the database", async () => {
        setCookieToken("cached-token");
        mocks.getCachedSession.mockResolvedValue({
            sessionId: "session-1",
            expiresAt: "2026-06-01T20:00:00.000Z",
            revokedAt: null,
            lastActivityAt: "2026-06-01T07:59:30.000Z",
            activityPersistedAt: "2026-06-01T07:59:30.000Z",
            sessionVersion: 0,
            user: createCachedUser(),
        });

        const session = await getRequestSession();

        expect(session?.user.id).toBe("user-1");
        expect(session?.sessionId).toBe("session-1");
        expect(mocks.userSessionFindUnique).not.toHaveBeenCalled();
        expect(mocks.userSessionUpdate).not.toHaveBeenCalled();
        expect(mocks.setCachedSession).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                lastActivityAt: "2026-06-01T08:00:00.000Z",
                activityPersistedAt: "2026-06-01T07:59:30.000Z",
            }),
        );
    });

    it("reads the current session id from cache before querying the database", async () => {
        setCookieToken("cached-token");
        mocks.getCachedSession.mockResolvedValue({
            sessionId: "session-1",
            expiresAt: "2026-06-01T20:00:00.000Z",
            revokedAt: null,
            lastActivityAt: "2026-06-01T07:59:30.000Z",
            activityPersistedAt: "2026-06-01T07:59:30.000Z",
            sessionVersion: 0,
            user: createCachedUser(),
        });

        const sessionId = await getCurrentSessionId();

        expect(sessionId).toBe("session-1");
        expect(mocks.userSessionFindUnique).not.toHaveBeenCalled();
    });

    it("rejects cached sessions marked as revoked", async () => {
        setCookieToken("revoked-cached-token");
        mocks.getCachedSession.mockResolvedValue({
            sessionId: "session-1",
            expiresAt: "2026-06-01T20:00:00.000Z",
            revokedAt: "2026-06-01T07:58:00.000Z",
            lastActivityAt: "2026-06-01T07:59:30.000Z",
            activityPersistedAt: "2026-06-01T07:59:30.000Z",
            sessionVersion: 0,
            user: createCachedUser(),
        });

        const session = await getRequestSession();

        expect(session).toBeNull();
        expect(mocks.deleteCachedSession).toHaveBeenCalledWith(expect.any(String));
        expect(mocks.userSessionFindUnique).not.toHaveBeenCalled();
        expect(mocks.setCachedSession).not.toHaveBeenCalled();
    });

    it("rechecks the database when cached session version is stale", async () => {
        setCookieToken("stale-cached-token");
        mocks.getCachedSession.mockResolvedValue({
            sessionId: "session-1",
            expiresAt: "2026-06-01T20:00:00.000Z",
            revokedAt: null,
            lastActivityAt: "2026-06-01T07:59:30.000Z",
            activityPersistedAt: "2026-06-01T07:59:30.000Z",
            sessionVersion: 1,
            user: createCachedUser(),
        });
        mocks.getUserSessionVersion.mockResolvedValue(2);
        mocks.userSessionFindUnique.mockResolvedValue({
            id: "session-1",
            expiresAt: new Date("2026-06-01T20:00:00.000Z"),
            revokedAt: new Date("2026-06-01T07:58:00.000Z"),
            lastActivityAt: new Date("2026-06-01T07:59:30.000Z"),
            user: createDbUser(),
        });

        const session = await getRequestSession();

        expect(session).toBeNull();
        expect(mocks.deleteCachedSession).toHaveBeenCalledWith(expect.any(String));
        expect(mocks.userSessionFindUnique).toHaveBeenCalledWith({
            where: { sessionTokenHash: expect.any(String) },
            include: {
                user: {
                    include: { school: { select: { disabledAt: true } } },
                },
            },
        });
        expect(mocks.setCachedSession).not.toHaveBeenCalled();
    });

    it("persists cached session activity after the flush interval", async () => {
        setCookieToken("cached-token");
        mocks.getCachedSession.mockResolvedValue({
            sessionId: "session-1",
            expiresAt: "2026-06-01T20:00:00.000Z",
            revokedAt: null,
            lastActivityAt: "2026-06-01T07:55:00.000Z",
            activityPersistedAt: "2026-06-01T07:55:00.000Z",
            sessionVersion: 0,
            user: createCachedUser(),
        });

        await getRequestSession();

        expect(mocks.userSessionUpdateMany).toHaveBeenCalledWith({
            where: {
                id: "session-1",
                lastActivityAt: {
                    lte: new Date("2026-06-01T07:59:00.000Z"),
                },
            },
            data: { lastActivityAt: new Date("2026-06-01T08:00:00.000Z") },
        });
        expect(mocks.setCachedSession).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                activityPersistedAt: "2026-06-01T08:00:00.000Z",
            }),
        );
    });

    it("revokes and rejects idle sessions", async () => {
        setCookieToken("idle-token");
        mocks.userSessionFindUnique.mockResolvedValue({
            id: "session-1",
            expiresAt: new Date("2026-06-01T20:00:00.000Z"),
            revokedAt: null,
            lastActivityAt: new Date("2026-06-01T03:30:00.000Z"),
            user: createDbUser(),
        });

        const session = await getRequestSession();

        expect(session).toBeNull();
        expect(mocks.userSessionUpdateMany).toHaveBeenCalledWith({
            where: {
                sessionTokenHash: expect.any(String),
                revokedAt: null,
            },
            data: { revokedAt: new Date("2026-06-01T08:00:00.000Z") },
        });
        expect(mocks.deleteCachedSession).toHaveBeenCalledWith(expect.any(String));
    });

    it("revokes cached idle sessions", async () => {
        setCookieToken("idle-cached-token");
        mocks.getCachedSession.mockResolvedValue({
            sessionId: "session-1",
            expiresAt: "2026-06-01T20:00:00.000Z",
            lastActivityAt: "2026-06-01T03:30:00.000Z",
            activityPersistedAt: "2026-06-01T03:30:00.000Z",
            user: {
                id: "user-1",
                email: "teacher@example.com",
                name: "ครูทดสอบ",
                image: null,
                role: "school_admin",
                isPrimary: true,
                schoolId: "school-1",
                emailVerified: null,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                updatedAt: new Date("2026-01-02T00:00:00.000Z"),
            },
        });

        const session = await getRequestSession();

        expect(session).toBeNull();
        expect(mocks.userSessionUpdateMany).toHaveBeenCalledWith({
            where: {
                sessionTokenHash: expect.any(String),
                revokedAt: null,
            },
            data: { revokedAt: new Date("2026-06-01T08:00:00.000Z") },
        });
        expect(mocks.userSessionFindUnique).not.toHaveBeenCalled();
    });

    it("rotates old session tokens while preserving absolute expiry", async () => {
        setCookieToken("old-token");
        mocks.userSessionFindUnique.mockResolvedValue({
            id: "session-1",
            expiresAt: new Date("2026-06-01T10:00:00.000Z"),
            revokedAt: null,
            tokenRotatedAt: new Date("2026-06-01T01:00:00.000Z"),
            user: { deletedAt: null },
        });
        mocks.userSessionUpdate.mockResolvedValue({ id: "session-1" });

        const rotated = await rotateCurrentSessionToken();

        expect(rotated?.maxAgeSeconds).toBe(7200);
        expect(mocks.userSessionUpdate).toHaveBeenCalledWith({
            where: { id: "session-1" },
            data: expect.objectContaining({
                sessionTokenHash: expect.any(String),
                tokenRotatedAt: new Date("2026-06-01T08:00:00.000Z"),
                lastActivityAt: new Date("2026-06-01T08:00:00.000Z"),
            }),
        });
        expect(mocks.deleteCachedSession).toHaveBeenCalledWith(expect.any(String));
    });

    it("backfills current session metadata from request headers", async () => {
        setCookieToken("metadata-token");
        mocks.userSessionUpdateMany.mockResolvedValue({ count: 1 });

        await updateCurrentSessionMetadata(
            createHeaderGetter("Mozilla/5.0 Firefox/126.0"),
        );

        expect(mocks.userSessionUpdateMany).toHaveBeenCalledWith({
            where: {
                sessionTokenHash: expect.any(String),
                revokedAt: null,
            },
            data: {
                userAgentLabel: "Firefox บนคอมพิวเตอร์",
                userAgentHash: expect.any(String),
                lastIpPrefix: "203.0.113.0/24",
            },
        });
        expect(mocks.deleteCachedSession).toHaveBeenCalledWith(expect.any(String));
    });

    it("deletes single-session cache entries when revoking a token", async () => {
        await revokeSessionToken("session-token");

        expect(mocks.userSessionUpdateMany).toHaveBeenCalledWith({
            where: {
                sessionTokenHash: expect.any(String),
                revokedAt: null,
            },
            data: { revokedAt: new Date("2026-06-01T08:00:00.000Z") },
        });
        expect(mocks.deleteCachedSession).toHaveBeenCalledWith(expect.any(String));
    });

    it("deletes all tracked session caches when revoking user sessions", async () => {
        await revokeUserSessions("user-1");

        expect(mocks.userSessionUpdateMany).toHaveBeenCalledWith({
            where: { userId: "user-1", revokedAt: null },
            data: { revokedAt: new Date("2026-06-01T08:00:00.000Z") },
        });
        expect(mocks.bumpUserSessionVersion).toHaveBeenCalledWith("user-1");
        expect(mocks.deleteUserSessionCaches).toHaveBeenCalledWith("user-1");
    });

    it("deletes tracked caches when revoking one user session", async () => {
        await revokeUserSessionById("user-1", "session-2");

        expect(mocks.userSessionUpdateMany).toHaveBeenCalledWith({
            where: {
                id: "session-2",
                userId: "user-1",
                revokedAt: null,
            },
            data: { revokedAt: new Date("2026-06-01T08:00:00.000Z") },
        });
        expect(mocks.bumpUserSessionVersion).toHaveBeenCalledWith("user-1");
        expect(mocks.deleteUserSessionCaches).toHaveBeenCalledWith("user-1");
    });

    it("deletes tracked caches when revoking other user sessions", async () => {
        await revokeOtherUserSessions("user-1", "session-1");

        expect(mocks.userSessionUpdateMany).toHaveBeenCalledWith({
            where: {
                userId: "user-1",
                revokedAt: null,
                id: { not: "session-1" },
            },
            data: { revokedAt: new Date("2026-06-01T08:00:00.000Z") },
        });
        expect(mocks.bumpUserSessionVersion).toHaveBeenCalledWith("user-1");
        expect(mocks.deleteUserSessionCaches).toHaveBeenCalledWith("user-1");
    });
});
