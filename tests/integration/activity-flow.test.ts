/**
 * Integration Test: Activity Flow
 *
 * Tests access control and status guards for activity progress
 * using real Prisma + mocked auth.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
    setupAuthMocks,
    mockSession,
    mockUnauthenticated,
    createMockUsers,
} from "./helpers/auth-mock";
import {
    createTestSchool,
    createTestUser,
    createTestTeacher,
    createTestStudent,
    createTestAcademicYear,
    createTestPhqResult,
    createTestActivityProgress,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

setupAuthMocks();

// Unique users for THIS test file
const USERS = createMockUsers("af");

const { getActivityProgress } = await import("@/lib/actions/activity/queries");
const { submitTeacherAssessment } =
    await import("@/lib/actions/activity/mutations");

describe("Integration: Activity Flow", () => {
    let studentId: string;
    let phqResultId: string;
    let activityProgressId: string;

    beforeAll(async () => {
        const school = await createTestSchool();
        const otherSchool = await createTestSchool({ name: "โรงเรียนอื่น" });

        const ay = await createTestAcademicYear({ year: 2599, semester: 1 });

        USERS.schoolAdmin.schoolId = school.id;
        USERS.classTeacher.schoolId = school.id;
        USERS.otherTeacher.schoolId = otherSchool.id;

        await createTestUser(USERS.systemAdmin, school.id);
        await createTestUser(USERS.schoolAdmin, school.id);
        await createTestUser(USERS.classTeacher, school.id);
        await createTestUser(USERS.otherTeacher, otherSchool.id);

        await createTestTeacher(USERS.classTeacher.id, ay.id, {
            advisoryClass: "ม.2/5",
        });
        await createTestTeacher(USERS.otherTeacher.id, ay.id, {
            advisoryClass: "ม.3/1",
        });

        const student = await createTestStudent(school.id, {
            class: "ม.2/5",
        });
        studentId = student.id;

        const phq = await createTestPhqResult(
            studentId,
            ay.id,
            USERS.classTeacher.id,
        );
        phqResultId = phq.id;

        const ap = await createTestActivityProgress(studentId, phqResultId, 1, {
            status: "completed",
        });
        activityProgressId = ap.id;
    });

    afterAll(async () => {
        await cleanupAll();
    });

    describe("getActivityProgress — Access Control", () => {
        it("system_admin can view any student's activity", async () => {
            mockSession(USERS.systemAdmin);
            const result = await getActivityProgress(studentId, phqResultId);
            expect(result.success).toBe(true);
        });

        it("school_admin can view student in same school", async () => {
            mockSession(USERS.schoolAdmin);
            const result = await getActivityProgress(studentId, phqResultId);
            expect(result.success).toBe(true);
        });

        it("class_teacher can view student in advisory class", async () => {
            mockSession(USERS.classTeacher);
            const result = await getActivityProgress(studentId, phqResultId);
            expect(result.success).toBe(true);
        });

        it("class_teacher CANNOT view student in different school", async () => {
            mockSession(USERS.otherTeacher);
            const result = await getActivityProgress(studentId, phqResultId);
            expect(result.success).toBe(false);
        });

        it("unauthenticated user gets error", async () => {
            mockUnauthenticated();
            const result = await getActivityProgress(studentId, phqResultId);
            expect(result.success).toBe(false);
        });
    });

    describe("submitTeacherAssessment — Status Guard", () => {
        it("allows assessment when status is 'completed'", async () => {
            mockSession(USERS.classTeacher);
            const result = await submitTeacherAssessment(activityProgressId, {
                internalProblems: "ปัญหาภายใน",
                externalProblems: "ปัญหาภายนอก",
                problemType: "internal",
            });
            expect(result.success).toBe(true);
        });

        it("rejects assessment when status is 'locked'", async () => {
            const lockedAp = await createTestActivityProgress(
                studentId,
                phqResultId,
                2,
                { status: "locked" },
            );

            mockSession(USERS.classTeacher);
            const result = await submitTeacherAssessment(lockedAp.id, {
                internalProblems: "ปัญหาภายใน",
                externalProblems: "ปัญหาภายนอก",
                problemType: "internal",
            });
            expect(result.success).toBe(false);
            expect(result.error).toContain("ไม่สามารถบันทึก");
        });

        it("rejects assessment when status is 'in_progress'", async () => {
            const inProgressAp = await createTestActivityProgress(
                studentId,
                phqResultId,
                3,
                { status: "in_progress" },
            );

            mockSession(USERS.classTeacher);
            const result = await submitTeacherAssessment(inProgressAp.id, {
                internalProblems: "ปัญหาภายใน",
                externalProblems: "ปัญหาภายนอก",
                problemType: "internal",
            });
            expect(result.success).toBe(false);
            expect(result.error).toContain("ไม่สามารถบันทึก");
        });
    });
});
