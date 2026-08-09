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
    createTestPhqResult,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/database/prisma";
import type { QueryResult } from "@/lib/actions/query-result";

function getQueryData<T>(result: QueryResult<T>): T {
    if (result.status === "success" || result.status === "empty") return result.data;
    throw new Error(`Expected query data, received ${result.status}`);
}

setupAuthMocks();

const USERS = createMockUsers("cs");

const { createCounselingSession, getCounselingSessions } =
    await import("@/lib/actions/counseling.actions");

describe("Integration: Counseling Sessions", () => {
    let studentId: string;
    let academicYearId: string;
    let historicalAcademicYearId: string;
    let academicYearStartDate: Date;
    let academicYearEndDate: Date;

    beforeAll(async () => {
        const school = await createTestSchool();
        const academicYear = await createTestAcademicYear({
            year: 2598,
            semester: 2,
        });
        const historicalAcademicYear = await createTestAcademicYear({
            year: 2597,
            semester: 2,
        });
        academicYearId = academicYear.id;
        historicalAcademicYearId = historicalAcademicYear.id;
        academicYearStartDate = academicYear.startDate;
        academicYearEndDate = academicYear.endDate;

        USERS.classTeacher.schoolId = school.id;

        await createTestUser(USERS.classTeacher, school.id);

        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: "ม.2/5",
        });

        const student = await createTestStudent(school.id, { class: "ม.2/5" });
        studentId = student.id;
        await createTestPhqResult(
            student.id,
            academicYear.id,
            USERS.classTeacher.id,
        );
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
                sessionDate: addDays(academicYearStartDate, 1),
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
                sessionDate: addDays(academicYearStartDate, 2),
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
                sessionDate: addDays(academicYearStartDate, 3),
                counselorName: "ครูทดสอบ",
                summary: "Session 3 notes",
            });
            expect(result.success).toBe(true);
            expect(result.session?.sessionNumber).toBe(3);
        });

        it("should not reuse the latest soft-deleted session number", async () => {
            mockSession(USERS.classTeacher);
            await prisma.counselingSession.updateMany({
                where: { studentId, sessionNumber: 3 },
                data: { deletedAt: new Date() },
            });

            const result = await createCounselingSession({
                studentId,
                academicYearId,
                sessionDate: addDays(academicYearStartDate, 4),
                counselorName: "ครูทดสอบ",
                summary: "Session after soft delete",
            });

            expect(result.success).toBe(true);
            expect(result.session?.sessionNumber).toBe(4);
        });
    });

    describe("Current academic care context", () => {
        it("rejects creating counseling in a historical academic term", async () => {
            mockSession(USERS.classTeacher);

            const result = await createCounselingSession({
                studentId,
                academicYearId: historicalAcademicYearId,
                sessionDate: addDays(academicYearStartDate, 5),
                counselorName: "ครูทดสอบ",
                summary: "ไม่ควรเพิ่มข้อมูลย้อนหลัง",
            });

            expect(result.success).toBe(false);
            await expect(
                prisma.counselingSession.count({
                    where: {
                        studentId,
                        academicYearId: historicalAcademicYearId,
                    },
                }),
            ).resolves.toBe(0);
        });

        it("rejects a session date outside the selected academic term", async () => {
            mockSession(USERS.classTeacher);

            const result = await createCounselingSession({
                studentId,
                academicYearId,
                sessionDate: addDays(academicYearEndDate, 1),
                counselorName: "ครูทดสอบ",
                summary: "วันที่อยู่นอกช่วงปีการศึกษา",
            });

            expect(result).toEqual({
                success: false,
                message: "วันที่ให้คำปรึกษาต้องอยู่ในช่วงปี/เทอมที่เลือก",
            });
        });
    });

    describe("Session List", () => {
        it("should return all sessions for a student", async () => {
            mockSession(USERS.classTeacher);
            const result = getQueryData(await getCounselingSessions(studentId));
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
                    sessionDate: new Date("2026-04-30T12:00:00"),
                    counselorName: "ครู legacy",
                    summary: "legacy session without academic year",
                    createdById: USERS.classTeacher.id,
                },
            });

            const result = getQueryData(
                await getCounselingSessions(studentId, {
                    academicYearId,
                    dateRange: {
                        startDate: new Date("2026-04-01T00:00:00"),
                        endDate: new Date("2026-04-30T23:59:59.999"),
                    },
                }),
            );

            expect(
                result.sessions.some(
                    (session) => session.sessionNumber === 999,
                ),
            ).toBe(true);
        });
    });
});

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
