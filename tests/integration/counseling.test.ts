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
    let academicYearId: string;

    beforeAll(async () => {
        const school = await createTestSchool();
        const academicYear = await createTestAcademicYear({
            year: 2598,
            semester: 2,
        });
        academicYearId = academicYear.id;

        USERS.classTeacher.schoolId = school.id;

        await createTestUser(USERS.classTeacher, school.id);

        await createTestTeacher(USERS.classTeacher.id, {
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
                academicYearId,
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
                academicYearId,
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
                academicYearId,
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
            const result = await getCounselingSessions(studentId);
            expect(Array.isArray(result.sessions)).toBe(true);
            expect(result.sessions.length).toBeGreaterThanOrEqual(3);
            expect(result.pagination.total).toBeGreaterThanOrEqual(3);
        });

        it("should include legacy sessions without academicYearId via date-range fallback", async () => {
            mockSession(USERS.classTeacher);

            await prisma.counselingSession.create({
                data: {
                    studentId,
                    sessionNumber: 999,
                    sessionDate: new Date("2026-06-15"),
                    counselorName: "ครู legacy",
                    summary: "legacy session without academic year",
                    createdById: USERS.classTeacher.id,
                },
            });

            const result = await getCounselingSessions(studentId, {
                academicYearId,
                dateRange: {
                    startDate: new Date("2026-06-01"),
                    endDate: new Date("2026-06-30"),
                },
            });

            expect(
                result.sessions.some(
                    (session) => session.sessionNumber === 999,
                ),
            ).toBe(true);
        });
    });
});
