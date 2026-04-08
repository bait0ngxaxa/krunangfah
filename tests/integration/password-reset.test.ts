/**
 * Integration Test: Password Reset
 *
 * Tests token verification and atomic password+token update
 * using real Prisma + mocked auth.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupAuthMocks, createMockUsers } from "./helpers/auth-mock";
import { createTestSchool, createTestUser } from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
    generatePasswordResetToken,
    hashPasswordResetToken,
} from "@/lib/token";

setupAuthMocks();

const USERS = createMockUsers("pr");

const { resetPassword } = await import("@/lib/actions/forgot-password.actions");

describe("Integration: Password Reset", () => {
    let testUserEmail: string;
    let validToken: string;

    beforeAll(async () => {
        const school = await createTestSchool();
        await createTestUser(USERS.schoolAdmin, school.id);
        testUserEmail = USERS.schoolAdmin.email;
    });

    afterAll(async () => {
        await prisma.passwordResetToken
            .deleteMany({ where: { email: testUserEmail } })
            .catch(() => {});
        await cleanupAll();
    });

    describe("resetPassword - Token + Password Atomicity", () => {
        it("keeps only one active token per email when generating twice", async () => {
            const firstToken = await generatePasswordResetToken(testUserEmail);
            const secondToken = await generatePasswordResetToken(testUserEmail);

            expect(firstToken).not.toBe(secondToken);

            const tokens = await prisma.passwordResetToken.findMany({
                where: { email: testUserEmail },
                orderBy: { createdAt: "asc" },
            });

            expect(tokens).toHaveLength(1);
            expect(tokens[0].token).toBe(hashPasswordResetToken(secondToken));
        });

        it("rejects invalid token", async () => {
            const result = await resetPassword({
                token: "nonexistent-token",
                password: "NewPassword123!",
                confirmPassword: "NewPassword123!",
            });
            expect(result.success).toBe(false);
        });

        it("rejects expired token", async () => {
            const expiredPlainToken = `test-expired-${Date.now()}`;
            const expiredToken = await prisma.passwordResetToken.upsert({
                where: { email: testUserEmail },
                update: {
                    token: hashPasswordResetToken(expiredPlainToken),
                    expiresAt: new Date(Date.now() - 3600000),
                },
                create: {
                    email: testUserEmail,
                    token: hashPasswordResetToken(expiredPlainToken),
                    expiresAt: new Date(Date.now() - 3600000),
                },
            });

            const result = await resetPassword({
                token: expiredPlainToken,
                password: "NewPassword123!",
                confirmPassword: "NewPassword123!",
            });
            expect(result.success).toBe(false);

            await prisma.passwordResetToken.deleteMany({
                where: { id: expiredToken.id },
            });
        });

        it("successfully resets password and deletes token", async () => {
            const plainToken = `test-valid-${Date.now()}`;
            const token = await prisma.passwordResetToken.upsert({
                where: { email: testUserEmail },
                update: {
                    token: hashPasswordResetToken(plainToken),
                    expiresAt: new Date(Date.now() + 3600000),
                },
                create: {
                    email: testUserEmail,
                    token: hashPasswordResetToken(plainToken),
                    expiresAt: new Date(Date.now() + 3600000),
                },
            });
            validToken = plainToken;

            const newPassword = "NewSecurePassword123!";
            const result = await resetPassword({
                token: validToken,
                password: newPassword,
                confirmPassword: newPassword,
            });
            expect(result.success).toBe(true);

            // Verify password was actually changed
            const updatedUser = await prisma.user.findUnique({
                where: { email: testUserEmail },
                select: { password: true },
            });
            expect(updatedUser?.password).toBeDefined();
            const matches = await bcrypt.compare(
                newPassword,
                updatedUser!.password!,
            );
            expect(matches).toBe(true);

            // Verify token was deleted
            const deletedToken = await prisma.passwordResetToken.findUnique({
                where: { token: token.token },
            });
            expect(deletedToken).toBeNull();
        });

        it("token cannot be reused after reset", async () => {
            const result = await resetPassword({
                token: validToken,
                password: "AnotherPassword123!",
                confirmPassword: "AnotherPassword123!",
            });
            expect(result.success).toBe(false);
        });
    });
});

