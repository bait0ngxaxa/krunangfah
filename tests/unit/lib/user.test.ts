import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcryptjs", () => ({
    hash: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        systemAdminWhitelist: {
            findUnique: vi.fn(),
        },
    },
}));

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createUser, getUserById, hashPassword } from "@/lib/user";

describe("lib/user", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("hashPassword hashes using bcrypt cost 12", async () => {
        vi.mocked(hash).mockResolvedValue("hashed-value" as never);

        const result = await hashPassword("plain-password");

        expect(result).toBe("hashed-value");
        expect(hash).toHaveBeenCalledWith("plain-password", 12);
    });

    it("createUser returns failure when email already exists", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
            id: "existing",
            email: "exists@test.local",
        } as never);

        const result = await createUser({
            email: "exists@test.local",
            password: "Password123!",
        });

        expect(result.success).toBe(false);
        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("createUser creates school_admin when email is not whitelisted", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);
        vi.mocked(hash).mockResolvedValue("hashed-password" as never);
        vi.mocked(prisma.systemAdminWhitelist.findUnique).mockResolvedValueOnce(
            null as never,
        );

        const now = new Date();
        vi.mocked(prisma.user.create).mockResolvedValueOnce({
            id: "u1",
            email: "new@test.local",
            name: null,
            image: null,
            role: "school_admin",
            emailVerified: null,
            createdAt: now,
            updatedAt: now,
        } as never);

        const result = await createUser({
            email: "new@test.local",
            password: "Password123!",
        });

        expect(result.success).toBe(true);
        expect(prisma.user.create).toHaveBeenCalledWith({
            data: {
                email: "new@test.local",
                password: "hashed-password",
                role: "school_admin",
            },
        });
        expect(result.user?.role).toBe("school_admin");
    });

    it("createUser creates system_admin when email is whitelisted", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);
        vi.mocked(hash).mockResolvedValue("hashed-password" as never);
        vi.mocked(prisma.systemAdminWhitelist.findUnique).mockResolvedValueOnce({
            id: "wl-1",
            email: "sa@test.local",
            isActive: true,
        } as never);

        const now = new Date();
        vi.mocked(prisma.user.create).mockResolvedValueOnce({
            id: "u2",
            email: "sa@test.local",
            name: null,
            image: null,
            role: "system_admin",
            emailVerified: null,
            createdAt: now,
            updatedAt: now,
        } as never);

        const result = await createUser({
            email: "sa@test.local",
            password: "Password123!",
        });

        expect(result.success).toBe(true);
        expect(prisma.user.create).toHaveBeenCalledWith({
            data: {
                email: "sa@test.local",
                password: "hashed-password",
                role: "system_admin",
            },
        });
        expect(result.user?.role).toBe("system_admin");
    });

    it("createUser returns failure when unexpected error occurs", async () => {
        vi.mocked(prisma.user.findUnique).mockRejectedValue(
            new Error("db unavailable"),
        );

        const result = await createUser({
            email: "err@test.local",
            password: "Password123!",
        });

        expect(result.success).toBe(false);
    });

    it("getUserById returns mapped user", async () => {
        const now = new Date();
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
            id: "u3",
            email: "found@test.local",
            name: "Found User",
            image: null,
            role: "class_teacher",
            emailVerified: null,
            createdAt: now,
            updatedAt: now,
        } as never);

        const result = await getUserById("u3");

        expect(result).toEqual({
            id: "u3",
            email: "found@test.local",
            name: "Found User",
            image: null,
            role: "class_teacher",
            emailVerified: null,
            createdAt: now,
            updatedAt: now,
        });
    });

    it("getUserById returns null when user does not exist", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);

        const result = await getUserById("missing");

        expect(result).toBeNull();
    });

    it("getUserById returns null when query throws", async () => {
        vi.mocked(prisma.user.findUnique).mockRejectedValue(
            new Error("query failed"),
        );

        const result = await getUserById("u4");

        expect(result).toBeNull();
    });
});
