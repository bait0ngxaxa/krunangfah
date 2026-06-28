import { beforeEach, describe, expect, it, vi } from "vitest";
import { headers } from "next/headers";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import {
    getCurrentSessionId,
    revokeOtherUserSessions,
    revokeUserSessionById,
    updateCurrentSessionMetadata,
} from "@/lib/auth/session-store";
import {
    listMySessions,
    revokeOtherSessions,
    revokeSessionById,
} from "@/lib/actions/session-management.actions";

const mocks = vi.hoisted(() => ({
    headers: vi.fn(),
    requireAuth: vi.fn(),
    getCurrentSessionId: vi.fn(),
    revokeOtherUserSessions: vi.fn(),
    revokeUserSessionById: vi.fn(),
    updateCurrentSessionMetadata: vi.fn(),
    userSessionFindMany: vi.fn(),
}));

vi.mock("next/headers", () => ({
    headers: mocks.headers,
}));

vi.mock("@/lib/auth/session", () => ({
    requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/auth/session-store", () => ({
    getCurrentSessionId: mocks.getCurrentSessionId,
    revokeOtherUserSessions: mocks.revokeOtherUserSessions,
    revokeUserSessionById: mocks.revokeUserSessionById,
    updateCurrentSessionMetadata: mocks.updateCurrentSessionMetadata,
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        userSession: {
            findMany: mocks.userSessionFindMany,
        },
    },
}));

function mockSession(): void {
    vi.mocked(requireAuth).mockResolvedValue({
        expires: "2026-06-02T00:00:00.000Z",
        user: {
            id: "user-1",
            email: "teacher@example.com",
            name: "ครูทดสอบ",
            image: null,
            role: "school_admin",
            isPrimary: true,
            schoolId: "school-1",
        },
    });
}

function mockHeaders(): void {
    vi.mocked(headers).mockResolvedValue({
        get: vi.fn((name: string) =>
            name.toLowerCase() === "user-agent" ? "Mozilla/5.0 Chrome" : null,
        ),
    } as never);
}

function createSessionRows() {
    return [
        {
            id: "current-session",
            createdAt: new Date("2026-06-01T08:00:00.000Z"),
            expiresAt: new Date("2026-06-02T08:00:00.000Z"),
            lastActivityAt: new Date("2026-06-01T10:00:00.000Z"),
            userAgentLabel: "Chrome บนคอมพิวเตอร์",
            lastIpPrefix: "203.0.113.0/24",
        },
        {
            id: "other-session",
            createdAt: new Date("2026-06-01T07:00:00.000Z"),
            expiresAt: new Date("2026-06-02T07:00:00.000Z"),
            lastActivityAt: new Date("2026-06-01T09:00:00.000Z"),
            userAgentLabel: null,
            lastIpPrefix: null,
        },
    ];
}

describe("session management actions", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-01T10:30:00.000Z"));
        vi.clearAllMocks();
        mockSession();
        mockHeaders();
        vi.mocked(getCurrentSessionId).mockResolvedValue("current-session");
        vi.mocked(revokeOtherUserSessions).mockResolvedValue(undefined);
        vi.mocked(revokeUserSessionById).mockResolvedValue(undefined);
        vi.mocked(updateCurrentSessionMetadata).mockResolvedValue(undefined);
        vi.mocked(prisma.userSession.findMany).mockResolvedValue(
            createSessionRows() as never,
        );
    });

    it("lists active sessions and marks the current session", async () => {
        const result = await listMySessions();

        expect(result.success).toBe(true);
        expect(updateCurrentSessionMetadata).toHaveBeenCalled();
        expect(prisma.userSession.findMany).toHaveBeenCalledWith({
            where: {
                userId: "user-1",
                revokedAt: null,
                expiresAt: { gt: new Date("2026-06-01T10:30:00.000Z") },
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
        expect(result.sessions[0]).toMatchObject({
            id: "current-session",
            isCurrent: true,
            userAgentLabel: "Chrome บนคอมพิวเตอร์",
        });
        expect(result.sessions[1]).toMatchObject({
            id: "other-session",
            isCurrent: false,
            userAgentLabel: "อุปกรณ์ไม่ทราบชนิด",
        });
    });

    it("does not revoke the current session from the management panel", async () => {
        const result = await revokeSessionById("current-session");

        expect(result.success).toBe(false);
        expect(result.message).toBe(
            "ไม่สามารถออกจากระบบ session ปัจจุบันจากหน้านี้ได้",
        );
        expect(revokeUserSessionById).not.toHaveBeenCalled();
    });

    it("revokes a selected non-current session owned by the user", async () => {
        const result = await revokeSessionById("other-session");

        expect(revokeUserSessionById).toHaveBeenCalledWith(
            "user-1",
            "other-session",
        );
        expect(result.success).toBe(true);
        expect(result.message).toBe("ออกจากระบบอุปกรณ์ที่เลือกแล้ว");
    });

    it("revokes every other active session while keeping the current one", async () => {
        const result = await revokeOtherSessions();

        expect(revokeOtherUserSessions).toHaveBeenCalledWith(
            "user-1",
            "current-session",
        );
        expect(result.success).toBe(true);
        expect(result.message).toBe("ออกจากระบบอุปกรณ์อื่นทั้งหมดแล้ว");
    });
});
