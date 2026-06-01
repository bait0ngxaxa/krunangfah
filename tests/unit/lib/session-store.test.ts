import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
    getRequestSession,
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
}));

vi.mock("@/lib/prisma", () => ({
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
    });

    it("creates a stateful session with hashed token and request metadata", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(createDbUser() as never);
        mocks.whitelistFindUnique.mockResolvedValue(null);
        vi.mocked(compare).mockResolvedValue(true as never);
        mocks.userSessionCreate.mockResolvedValue({ id: "session-1" });

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
        });
        const data = mocks.userSessionCreate.mock.calls[0][0].data;
        expect(data.sessionTokenHash).toHaveLength(64);
        if (result.success) {
            expect(data.sessionTokenHash).not.toBe(result.token);
        }
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
        expect(mocks.userSessionUpdate).toHaveBeenCalledWith({
            where: { id: "session-1" },
            data: { lastActivityAt: new Date("2026-06-01T08:00:00.000Z") },
        });
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
    });
});
