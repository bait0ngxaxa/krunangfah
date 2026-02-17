/**
 * Integration Test: Teacher Invite
 *
 * Tests invite acceptance with atomic user+teacher creation
 * using real Prisma + mocked auth.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
    setupAuthMocks,
    mockSession,
    createMockUsers,
} from "./helpers/auth-mock";
import {
    createTestSchool,
    createTestUser,
    createTestAcademicYear,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";

setupAuthMocks();

const USERS = createMockUsers("ti");

const { acceptTeacherInvite } =
    await import("@/lib/actions/teacher-invite/mutations");

describe("Integration: Teacher Invite", () => {
    let schoolId: string;
    let academicYearId: string;

    beforeAll(async () => {
        const school = await createTestSchool();
        schoolId = school.id;

        USERS.schoolAdmin.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);

        const ay = await createTestAcademicYear({ year: 2596, semester: 1 });
        academicYearId = ay.id;
    });

    afterAll(async () => {
        const invites = await prisma.teacherInvite.findMany({
            where: { invitedById: USERS.schoolAdmin.id },
        });
        for (const invite of invites) {
            const user = await prisma.user.findUnique({
                where: { email: invite.email },
            });
            if (user) {
                await prisma.teacher
                    .deleteMany({ where: { userId: user.id } })
                    .catch(() => {});
                await prisma.user
                    .delete({ where: { id: user.id } })
                    .catch(() => {});
            }
        }
        await prisma.teacherInvite
            .deleteMany({ where: { invitedById: USERS.schoolAdmin.id } })
            .catch(() => {});
        await cleanupAll();
    });

    describe("acceptTeacherInvite — Atomic Creation", () => {
        it("rejects invalid token", async () => {
            const result = await acceptTeacherInvite(
                "nonexistent-token",
                "password123",
            );
            expect(result.success).toBe(false);
        });

        it("rejects expired invite", async () => {
            const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const invite = await prisma.teacherInvite.create({
                data: {
                    token: `test-expired-${uid}`,
                    email: `test-expired-${uid}@test.local`,
                    firstName: "Expired",
                    lastName: "Teacher",
                    age: 30,
                    userRole: "class_teacher",
                    advisoryClass: "ม.1/1",
                    academicYearId,
                    schoolId,
                    schoolRole: "ครู",
                    projectRole: "care",
                    invitedById: USERS.schoolAdmin.id,
                    expiresAt: new Date(Date.now() - 86400000),
                },
            });

            const result = await acceptTeacherInvite(
                invite.token,
                "password123",
            );
            expect(result.success).toBe(false);
        });

        it("successfully accepts invite and creates user + teacher atomically", async () => {
            const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const inviteEmail = `test-invite-${uid}@test.local`;

            const invite = await prisma.teacherInvite.create({
                data: {
                    token: `test-valid-invite-${uid}`,
                    email: inviteEmail,
                    firstName: "New",
                    lastName: "Teacher",
                    age: 28,
                    userRole: "class_teacher",
                    advisoryClass: "ม.4/1",
                    academicYearId,
                    schoolId,
                    schoolRole: "ครูประจำชั้น",
                    projectRole: "lead",
                    invitedById: USERS.schoolAdmin.id,
                    expiresAt: new Date(Date.now() + 86400000),
                },
            });

            const result = await acceptTeacherInvite(
                invite.token,
                "SecurePassword123!",
            );

            if (!result.success) {
                console.error("acceptTeacherInvite failed:", result);
            }

            expect(result.success).toBe(true);

            // Verify user was created
            const user = await prisma.user.findUnique({
                where: { email: inviteEmail },
                include: { teacher: true },
            });
            expect(user).not.toBeNull();
            expect(user!.role).toBe("class_teacher");
            expect(user!.schoolId).toBe(schoolId);

            // Verify teacher profile was created (atomic)
            expect(user!.teacher).not.toBeNull();
            expect(user!.teacher!.advisoryClass).toBe("ม.4/1");
            expect(user!.teacher!.projectRole).toBe("lead");

            // Verify invite was marked as accepted
            const updatedInvite = await prisma.teacherInvite.findUnique({
                where: { id: invite.id },
            });
            expect(updatedInvite!.acceptedAt).not.toBeNull();
        });

        it("rejects already-accepted invite", async () => {
            const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const invite = await prisma.teacherInvite.create({
                data: {
                    token: `test-dup-${uid}`,
                    email: `test-dup-${uid}@test.local`,
                    firstName: "Dup",
                    lastName: "Teacher",
                    age: 30,
                    userRole: "class_teacher",
                    advisoryClass: "ม.5/1",
                    academicYearId,
                    schoolId,
                    schoolRole: "ครู",
                    projectRole: "coordinate",
                    invitedById: USERS.schoolAdmin.id,
                    expiresAt: new Date(Date.now() + 86400000),
                    acceptedAt: new Date(),
                },
            });

            const result = await acceptTeacherInvite(
                invite.token,
                "password123",
            );
            expect(result.success).toBe(false);
        });
    });
});
