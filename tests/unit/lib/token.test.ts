import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        $transaction: vi.fn(),
        passwordResetToken: {
            findUnique: vi.fn(),
            delete: vi.fn(),
            upsert: vi.fn(),
        },
    },
}));

import { prisma } from "@/lib/prisma";
import {
    generatePasswordResetToken,
    hashPasswordResetToken,
    verifyPasswordResetToken,
} from "@/lib/token";

describe("lib/token", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("hashPasswordResetToken returns deterministic SHA-256 hex", () => {
        const value = "plain-token";
        const hash1 = hashPasswordResetToken(value);
        const hash2 = hashPasswordResetToken(value);

        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("generatePasswordResetToken upserts hashed token in a transaction", async () => {
        const uuidSpy = vi
            .spyOn(crypto, "randomUUID")
            .mockReturnValue("123e4567-e89b-12d3-a456-426614174000");
        vi.mocked(prisma.$transaction).mockImplementation(
            async (callback: (tx: typeof prisma) => Promise<string>) =>
                callback(prisma as typeof prisma),
        );
        vi.mocked(prisma.passwordResetToken.upsert).mockResolvedValue(
            {} as never,
        );

        const token = await generatePasswordResetToken("u@test.local");

        expect(token).toBe("123e4567-e89b-12d3-a456-426614174000");
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.passwordResetToken.upsert).toHaveBeenCalledWith({
            where: { email: "u@test.local" },
            update: {
                token: hashPasswordResetToken("123e4567-e89b-12d3-a456-426614174000"),
                expiresAt: expect.any(Date),
            },
            create: {
                email: "u@test.local",
                token: hashPasswordResetToken("123e4567-e89b-12d3-a456-426614174000"),
                expiresAt: expect.any(Date),
            },
        });

        const upsertArg = vi.mocked(prisma.passwordResetToken.upsert).mock
            .calls[0][0] as { create: { expiresAt: Date } };
        const delta = upsertArg.create.expiresAt.getTime() - Date.now();
        expect(delta).toBeGreaterThan(59 * 60 * 1000);
        expect(delta).toBeLessThanOrEqual(60 * 60 * 1000);

        uuidSpy.mockRestore();
    });

    it("verifyPasswordResetToken returns invalid when token does not exist", async () => {
        vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(
            null as never,
        );

        const result = await verifyPasswordResetToken("not-found");

        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.error).toBeTruthy();
        }
    });

    it("verifyPasswordResetToken deletes expired token and returns invalid", async () => {
        vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
            id: "tok-1",
            email: "u@test.local",
            expiresAt: new Date(Date.now() - 1000),
        } as never);
        vi.mocked(prisma.passwordResetToken.delete).mockResolvedValue(
            {} as never,
        );

        const result = await verifyPasswordResetToken("expired-token");

        expect(result.valid).toBe(false);
        expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
            where: { id: "tok-1" },
        });
    });

    it("verifyPasswordResetToken returns email and tokenId for valid token", async () => {
        vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
            id: "tok-2",
            email: "u@test.local",
            expiresAt: new Date(Date.now() + 1000),
        } as never);

        const result = await verifyPasswordResetToken("valid-token");

        expect(result).toEqual({
            valid: true,
            email: "u@test.local",
            tokenId: "tok-2",
        });
    });
});
