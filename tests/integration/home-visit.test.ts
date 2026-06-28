/**
 * Integration Test: Home Visit
 *
 * Tests visit number auto-increment and academic year filtering fallback
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
import { prisma } from "@/lib/database/prisma";

setupAuthMocks();

const USERS = createMockUsers("hv");

const { createHomeVisit, getHomeVisits } =
    await import("@/lib/actions/home-visit.actions");

describe("Integration: Home Visits", () => {
    let studentId: string;
    let academicYearId: string;

    beforeAll(async () => {
        const school = await createTestSchool();
        const academicYear = await createTestAcademicYear({
            year: 2597,
            semester: 1,
        });
        academicYearId = academicYear.id;

        USERS.classTeacher.schoolId = school.id;

        await createTestUser(USERS.classTeacher, school.id);
        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: "ม.2/6",
        });

        const student = await createTestStudent(school.id, { class: "ม.2/6" });
        studentId = student.id;
    });

    afterAll(async () => {
        await prisma.homeVisit.deleteMany({ where: { studentId } }).catch(() => {});
        await cleanupAll();
    });

    it("should create visit with incrementing visitNumber and academicYearId", async () => {
        mockSession(USERS.classTeacher);

        const first = await createHomeVisit({
            studentId,
            academicYearId,
            visitDate: new Date("2026-06-10"),
            description: "เยี่ยมบ้านครั้งที่ 1",
        });
        expect(first.success).toBe(true);

        const second = await createHomeVisit({
            studentId,
            academicYearId,
            visitDate: new Date("2026-06-11"),
            description: "เยี่ยมบ้านครั้งที่ 2",
        });
        expect(second.success).toBe(true);

        const allVisits = await prisma.homeVisit.findMany({
            where: { studentId },
            orderBy: { visitNumber: "asc" },
            select: { visitNumber: true, academicYearId: true },
        });
        expect(allVisits[0]?.visitNumber).toBe(1);
        expect(allVisits[1]?.visitNumber).toBe(2);
        expect(allVisits[0]?.academicYearId).toBe(academicYearId);
        expect(allVisits[1]?.academicYearId).toBe(academicYearId);
    });

    it("should include legacy visits without academicYearId via date-range fallback", async () => {
        mockSession(USERS.classTeacher);

        await prisma.homeVisit.create({
            data: {
                studentId,
                visitNumber: 999,
                visitDate: new Date("2026-06-20"),
                description: "legacy home visit",
                teacherName: "ครู legacy",
                teacherRole: "ครูประจำชั้น",
                createdById: USERS.classTeacher.id,
            },
        });

        const result = await getHomeVisits(studentId, {
            academicYearId,
            dateRange: {
                startDate: new Date("2026-06-01"),
                endDate: new Date("2026-06-30"),
            },
        });

        expect(result.visits.some((visit) => visit.visitNumber === 999)).toBe(
            true,
        );
    });
});
