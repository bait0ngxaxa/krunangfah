/**
 * Integration Test: School Admin Invite Flow
 *
 * Covers:
 * 1) system_admin creates invite
 * 2) invite token validation
 * 3) school_admin accepts invite and user is created
 * 4) token cannot be reused
 * 5) expired token is rejected
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
    setupAuthMocks,
    mockSession,
    createMockUsers,
} from "./helpers/auth-mock";
import { createTestSchool, createTestUser } from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";

setupAuthMocks();

const USERS = createMockUsers("sai");

const {
    createSchoolAdminInvite,
    validateInviteToken,
    acceptSchoolAdminInvite,
} = await import("@/lib/actions/school-admin-invite.actions");

describe("Integration: School Admin Invite Flow", () => {
    const inviteEmails: string[] = [];

    beforeAll(async () => {
        const school = await createTestSchool();
        await createTestUser(USERS.systemAdmin, school.id);
    });

    afterAll(async () => {
        if (inviteEmails.length > 0) {
            await prisma.systemAdminWhitelist
                .deleteMany({ where: { email: { in: inviteEmails } } })
                .catch(() => {});
            await prisma.user
                .deleteMany({ where: { email: { in: inviteEmails } } })
                .catch(() => {});
            await prisma.schoolAdminInvite
                .deleteMany({ where: { email: { in: inviteEmails } } })
                .catch(() => {});
        }

        await cleanupAll();
    });

    it("system_admin creates school_admin invite and token is valid", async () => {
        mockSession(USERS.systemAdmin);

        const email = `school-admin-${Date.now()}@test.local`;
        inviteEmails.push(email);

        const createResult = await createSchoolAdminInvite(email, "school_admin");
        expect(createResult.success).toBe(true);
        expect(createResult.data?.inviteUrl).toContain("/invite/admin/");

        const token = createResult.data?.inviteUrl.split("/").at(-1) ?? "";
        expect(token.length).toBeGreaterThan(0);

        const dbInvite = await prisma.schoolAdminInvite.findUnique({
            where: { token },
        });
        expect(dbInvite).not.toBeNull();
        expect(dbInvite?.email).toBe(email);
        expect(dbInvite?.usedAt).toBeNull();
        expect(dbInvite?.role).toBe("school_admin");

        const validateResult = await validateInviteToken(token);
        expect(validateResult.email).toBe(email);
        expect(validateResult.role).toBe("school_admin");

        const acceptResult = await acceptSchoolAdminInvite(
            token,
            "StrongPassword123!",
        );
        expect(acceptResult.success).toBe(true);
        expect(acceptResult.redirectTo).toBe("/teacher-profile");

        const createdUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, role: true, isPrimary: true },
        });
        expect(createdUser).not.toBeNull();
        expect(createdUser?.role).toBe("school_admin");
        expect(createdUser?.isPrimary).toBe(true);

        const usedInvite = await prisma.schoolAdminInvite.findUnique({
            where: { token },
            select: { usedAt: true },
        });
        expect(usedInvite?.usedAt).not.toBeNull();

        const reuseResult = await acceptSchoolAdminInvite(token, "AnotherPass123!");
        expect(reuseResult.success).toBe(false);
    });

    it("expired invite is rejected on accept", async () => {
        mockSession(USERS.systemAdmin);

        const email = `expired-school-admin-${Date.now()}@test.local`;
        inviteEmails.push(email);

        const token = `expired-token-${Date.now()}`;
        await prisma.schoolAdminInvite.create({
            data: {
                token,
                email,
                role: "school_admin",
                expiresAt: new Date(Date.now() - 60_000),
                createdBy: USERS.systemAdmin.id,
            },
        });

        const result = await acceptSchoolAdminInvite(token, "StrongPassword123!");
        expect(result.success).toBe(false);

        const user = await prisma.user.findUnique({ where: { email } });
        expect(user).toBeNull();
    });
});

