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
    type MockUser,
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
import { prisma } from "@/lib/prisma";

setupAuthMocks();

// Unique users for THIS test file
const USERS = createMockUsers("af");
const SAME_SCHOOL_OTHER_CLASS_TEACHER: MockUser = {
    id: `sst-${Date.now().toString(36)}`,
    name: "Same School Other Class Teacher",
    email: `sst-${Date.now().toString(36)}@test.local`,
    role: "class_teacher",
    schoolId: "",
};

const { getActivityProgress } = await import("@/lib/actions/activity/queries");
const { submitTeacherAssessment, confirmActivityComplete } = await import(
    "@/lib/actions/activity/mutations"
);

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
        SAME_SCHOOL_OTHER_CLASS_TEACHER.schoolId = school.id;

        await createTestUser(USERS.systemAdmin, school.id);
        await createTestUser(USERS.schoolAdmin, school.id);
        await createTestUser(USERS.classTeacher, school.id);
        await createTestUser(USERS.otherTeacher, otherSchool.id);
        await createTestUser(SAME_SCHOOL_OTHER_CLASS_TEACHER, school.id);

        await createTestTeacher(USERS.classTeacher.id, ay.id, {
            advisoryClass: "ม.2/5",
        });
        await createTestTeacher(USERS.otherTeacher.id, ay.id, {
            advisoryClass: "ม.3/1",
        });
        await createTestTeacher(SAME_SCHOOL_OTHER_CLASS_TEACHER.id, ay.id, {
            advisoryClass: "ม.2/6",
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

    describe("getActivityProgress - Access Control", () => {
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

        it("class_teacher CANNOT view student in same school but different advisory class", async () => {
            mockSession(SAME_SCHOOL_OTHER_CLASS_TEACHER);
            const result = await getActivityProgress(studentId, phqResultId);
            expect(result.success).toBe(false);
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

    describe("submitTeacherAssessment - Status Guard", () => {
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
            expect(result.error).toBeDefined();
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
            expect(result.error).toBeDefined();
        });
    });

    describe("confirmActivityComplete - Atomic Completion + Unlock", () => {
        it("marks current activity complete and unlocks the next activity in the same flow", async () => {
            const current = await createTestActivityProgress(
                studentId,
                phqResultId,
                4,
                { status: "in_progress" },
            );
            const next = await createTestActivityProgress(studentId, phqResultId, 5, {
                status: "locked",
            });

            mockSession(USERS.classTeacher);
            const result = await confirmActivityComplete(current.id);

            expect(result.success).toBe(true);
            expect(result.activityNumber).toBe(4);

            const [updatedCurrent, updatedNext] = await Promise.all([
                prisma.activityProgress.findUnique({
                    where: { id: current.id },
                    select: {
                        status: true,
                        completedAt: true,
                    },
                }),
                prisma.activityProgress.findUnique({
                    where: { id: next.id },
                    select: {
                        status: true,
                        unlockedAt: true,
                    },
                }),
            ]);

            expect(updatedCurrent?.status).toBe("completed");
            expect(updatedCurrent?.completedAt).not.toBeNull();
            expect(updatedNext?.status).toBe("in_progress");
            expect(updatedNext?.unlockedAt).not.toBeNull();
        });

        it("is idempotent when activity is already completed", async () => {
            const completed = await createTestActivityProgress(
                studentId,
                phqResultId,
                6,
                { status: "completed" },
            );

            mockSession(USERS.classTeacher);
            const result = await confirmActivityComplete(completed.id);

            expect(result.success).toBe(true);
            expect(result.activityNumber).toBe(6);
        });
    });
});


