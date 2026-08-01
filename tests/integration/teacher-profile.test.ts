/**
 * Integration Test: Teacher Profile
 *
 * Tests profile access restriction
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
    createTestTeacher,
    createTestAcademicYear,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

setupAuthMocks();

const USERS = createMockUsers("tp");

const { getTeacherProfile } = await import("@/lib/actions/teacher.actions");

describe("Integration: Teacher Profile", () => {
    beforeAll(async () => {
        const school = await createTestSchool();
        const ay = await createTestAcademicYear({ year: 2597, semester: 1 });

        USERS.schoolAdmin.schoolId = school.id;
        USERS.classTeacher.schoolId = school.id;
        USERS.otherTeacher.schoolId = school.id;

        await createTestUser(USERS.systemAdmin, school.id);
        await createTestUser(USERS.schoolAdmin, school.id);
        await createTestUser(USERS.classTeacher, school.id);
        await createTestUser(USERS.otherTeacher, school.id);

        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: "ม.2/5",
        });
        await createTestTeacher(USERS.otherTeacher.id, {
            advisoryClass: "ม.3/1",
        });
    });

    afterAll(async () => {
        await cleanupAll();
    });

    describe("getTeacherProfile — Access Restriction", () => {
        it("teacher can view own profile", async () => {
            mockSession(USERS.classTeacher);
            const result = await getTeacherProfile(USERS.classTeacher.id);
            expect(result.status).toBe("success");
            if (result.status !== "success") {
                throw new Error("Expected teacher profile");
            }
            expect(result.data.advisoryClass).toBe("ม.2/5");
        });

        it("teacher CANNOT view another teacher's profile", async () => {
            mockSession(USERS.classTeacher);
            const result = await getTeacherProfile(USERS.otherTeacher.id);
            expect(result.status).toBe("forbidden");
        });

        it("system_admin CAN view any teacher's profile", async () => {
            mockSession(USERS.systemAdmin);
            const result = await getTeacherProfile(USERS.classTeacher.id);
            expect(result.status).toBe("success");
            if (result.status !== "success") {
                throw new Error("Expected teacher profile");
            }
            expect(result.data.advisoryClass).toBe("ม.2/5");
        });

        it("school_admin with no teacher profile returns not_found", async () => {
            mockSession(USERS.schoolAdmin);
            const result = await getTeacherProfile(USERS.schoolAdmin.id);
            expect(result.status).toBe("not_found");
        });
    });
});
