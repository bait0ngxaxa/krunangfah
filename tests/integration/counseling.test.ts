/**
 * Integration Test: Counseling Session
 *
 * Tests session number auto-increment and access control
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
    createTestStudent,
    createTestAcademicYear,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";

setupAuthMocks();

const USERS = createMockUsers("cs");

const { createCounselingSession, getCounselingSessions } =
    await import("@/lib/actions/counseling.actions");

describe("Integration: Counseling Sessions", () => {
    let studentId: string;

    beforeAll(async () => {
        const school = await createTestSchool();
        const ay = await createTestAcademicYear({ year: 2598, semester: 2 });

        USERS.classTeacher.schoolId = school.id;

        await createTestUser(USERS.classTeacher, school.id);

        await createTestTeacher(USERS.classTeacher.id, ay.id, {
            advisoryClass: "ม.2/5",
        });

        const student = await createTestStudent(school.id, { class: "ม.2/5" });
        studentId = student.id;
    });

    afterAll(async () => {
        await prisma.counselingSession
            .deleteMany({ where: { studentId } })
            .catch(() => {});
        await cleanupAll();
    });

    describe("Session Number Auto-Increment", () => {
        it("first session should have sessionNumber = 1", async () => {
            mockSession(USERS.classTeacher);
            const result = await createCounselingSession({
                studentId,
                sessionDate: new Date(),
                counselorName: "ครูทดสอบ",
                summary: "Session 1 notes",
            });
            expect(result.success).toBe(true);
            expect(result.session?.sessionNumber).toBe(1);
        });

        it("second session should have sessionNumber = 2", async () => {
            mockSession(USERS.classTeacher);
            const result = await createCounselingSession({
                studentId,
                sessionDate: new Date(),
                counselorName: "ครูทดสอบ",
                summary: "Session 2 notes",
            });
            expect(result.success).toBe(true);
            expect(result.session?.sessionNumber).toBe(2);
        });

        it("third session should have sessionNumber = 3", async () => {
            mockSession(USERS.classTeacher);
            const result = await createCounselingSession({
                studentId,
                sessionDate: new Date(),
                counselorName: "ครูทดสอบ",
                summary: "Session 3 notes",
            });
            expect(result.success).toBe(true);
            expect(result.session?.sessionNumber).toBe(3);
        });
    });

    describe("Session List", () => {
        it("should return all sessions for a student", async () => {
            mockSession(USERS.classTeacher);
            const sessions = await getCounselingSessions(studentId);
            expect(Array.isArray(sessions)).toBe(true);
            expect(sessions.length).toBeGreaterThanOrEqual(3);
        });
    });
});
