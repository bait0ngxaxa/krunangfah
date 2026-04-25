import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({
    auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth, requirePrimaryAdmin } from "@/lib/session";

function createSession(overrides?: Partial<Session["user"]>): Session {
    return {
        expires: "2099-01-01T00:00:00.000Z",
        user: {
            id: "user-1",
            email: "user@test.local",
            name: "Test User",
            image: null,
            role: "class_teacher",
            isPrimary: false,
            schoolId: "school-a",
            ...overrides,
        },
    };
}

describe("lib/session", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("requireAuth redirects to /signin when session is missing", async () => {
        vi.mocked(auth).mockResolvedValue(null);

        // redirect() in Next.js throws a NEXT_REDIRECT error internally
        await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("requireAuth refreshes role/isPrimary/schoolId from DB", async () => {
        vi.mocked(auth).mockResolvedValue(createSession());
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            role: "school_admin",
            isPrimary: true,
            schoolId: "school-b",
        } as never);

        const session = await requireAuth();

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: "user-1" },
            select: { role: true, isPrimary: true, schoolId: true },
        });
        expect(session.user.role).toBe("school_admin");
        expect(session.user.isPrimary).toBe(true);
        expect(session.user.schoolId).toBe("school-b");
    });

    it("requireAuth redirects to /signin when user no longer exists in DB", async () => {
        vi.mocked(auth).mockResolvedValue(createSession());
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

        // redirect() in Next.js throws a NEXT_REDIRECT error internally
        await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("requireAdmin allows promoted user immediately from DB claims", async () => {
        vi.mocked(auth).mockResolvedValue(
            createSession({ role: "class_teacher" }),
        );
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            role: "system_admin",
            isPrimary: false,
            schoolId: null,
        } as never);

        await expect(requireAdmin()).resolves.toMatchObject({
            user: { role: "system_admin" },
        });
    });

    it("requireAdmin blocks demoted user even if session token is stale", async () => {
        vi.mocked(auth).mockResolvedValue(
            createSession({ role: "system_admin" }),
        );
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            role: "school_admin",
            isPrimary: true,
            schoolId: "school-a",
        } as never);

        await expect(requireAdmin()).rejects.toThrow(
            "Forbidden: Admin access required",
        );
    });

    it("requirePrimaryAdmin allows user when DB says isPrimary=true", async () => {
        vi.mocked(auth).mockResolvedValue(
            createSession({ role: "school_admin", isPrimary: false }),
        );
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            role: "school_admin",
            isPrimary: true,
            schoolId: "school-a",
        } as never);

        await expect(requirePrimaryAdmin()).resolves.toMatchObject({
            user: { role: "school_admin", isPrimary: true },
        });
    });

    it("requirePrimaryAdmin blocks demoted primary user", async () => {
        vi.mocked(auth).mockResolvedValue(
            createSession({ role: "school_admin", isPrimary: true }),
        );
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            role: "school_admin",
            isPrimary: false,
            schoolId: "school-a",
        } as never);

        await expect(requirePrimaryAdmin()).rejects.toThrow(
            "Forbidden: Primary school admin access required",
        );
    });
});
