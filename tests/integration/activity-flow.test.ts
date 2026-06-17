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

        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: "ม.2/5",
        });
        await createTestTeacher(USERS.otherTeacher.id, {
            advisoryClass: "ม.3/1",
        });
        await createTestTeacher(SAME_SCHOOL_OTHER_CLASS_TEACHER.id, {
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

        it("rejects assessment when student has graduated", async () => {
            mockSession(USERS.classTeacher);
            await prisma.student.update({
                where: { id: studentId },
                data: { status: "GRADUATED", leftAt: null },
            });

            try {
                const result = await submitTeacherAssessment(activityProgressId, {
                    internalProblems: "ปัญหาภายใน",
                    externalProblems: "ปัญหาภายนอก",
                    problemType: "internal",
                });

                expect(result.success).toBe(false);
                expect(result.error).toContain("เรียนจบ");
            } finally {
                await prisma.student.update({
                    where: { id: studentId },
                    data: { status: "ACTIVE", leftAt: null },
                });
            }
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

    describe("referred student - class_teacher manage lock", () => {
        it("blocks class_teacher from submitting assessment after referral", async () => {
            await prisma.studentReferral.create({
                data: {
                    studentId,
                    fromTeacherUserId: USERS.classTeacher.id,
                    toTeacherUserId: USERS.schoolAdmin.id,
                },
            });

            mockSession(USERS.classTeacher);
            const result = await submitTeacherAssessment(activityProgressId, {
                internalProblems: "ปัญหาภายใน",
                externalProblems: "ปัญหาภายนอก",
                problemType: "internal",
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe(
                "นักเรียนคนนี้ถูกส่งต่อแล้ว ครูประจำชั้นไม่สามารถทำกิจกรรมต่อได้",
            );

            await prisma.studentReferral.delete({
                where: { studentId },
            });
        });

        it("blocks class_teacher from confirming activity after referral", async () => {
            const current = await createTestActivityProgress(
                studentId,
                phqResultId,
                7,
                { status: "in_progress" },
            );

            await prisma.studentReferral.create({
                data: {
                    studentId,
                    fromTeacherUserId: USERS.classTeacher.id,
                    toTeacherUserId: USERS.schoolAdmin.id,
                },
            });

            mockSession(USERS.classTeacher);
            const result = await confirmActivityComplete(current.id);

            expect(result.success).toBe(false);
            expect(result.error).toBe(
                "นักเรียนคนนี้ถูกส่งต่อแล้ว ครูประจำชั้นไม่สามารถทำกิจกรรมต่อได้",
            );

            const unchanged = await prisma.activityProgress.findUnique({
                where: { id: current.id },
                select: { status: true, completedAt: true },
            });
            expect(unchanged?.status).toBe("in_progress");
            expect(unchanged?.completedAt).toBeNull();

            await prisma.studentReferral.delete({
                where: { studentId },
            });
        });
    });

    describe("confirmActivityComplete - Atomic Completion + Unlock", () => {
        it("uses latest worksheet upload date as scheduledDate when none was selected", async () => {
            const current = await createTestActivityProgress(
                studentId,
                phqResultId,
                8,
                { status: "in_progress", teacherId: USERS.classTeacher.id },
            );
            const firstUploadDate = new Date("2026-05-10T03:00:00.000Z");
            const latestUploadDate = new Date("2026-05-11T04:30:00.000Z");

            await prisma.worksheetUpload.createMany({
                data: [
                    {
                        activityProgressId: current.id,
                        worksheetNumber: 1,
                        fileName: "worksheet-1.jpg",
                        fileUrl: "/api/uploads/worksheet-1.jpg",
                        fileType: "image/jpeg",
                        fileSize: 1024,
                        uploadedById: USERS.classTeacher.id,
                        uploadedAt: firstUploadDate,
                    },
                    {
                        activityProgressId: current.id,
                        worksheetNumber: 2,
                        fileName: "worksheet-2.jpg",
                        fileUrl: "/api/uploads/worksheet-2.jpg",
                        fileType: "image/jpeg",
                        fileSize: 1024,
                        uploadedById: USERS.classTeacher.id,
                        uploadedAt: latestUploadDate,
                    },
                ],
            });

            mockSession(USERS.classTeacher);
            const result = await confirmActivityComplete(current.id);

            expect(result.success).toBe(true);

            const updated = await prisma.activityProgress.findUnique({
                where: { id: current.id },
                select: {
                    status: true,
                    scheduledDate: true,
                    teacherId: true,
                },
            });

            expect(updated?.status).toBe("completed");
            expect(updated?.scheduledDate?.toISOString()).toBe(
                latestUploadDate.toISOString(),
            );
            expect(updated?.teacherId).toBe(USERS.classTeacher.id);
        });

        it("keeps the selected scheduledDate when completing activity", async () => {
            const selectedDate = new Date("2026-05-09T00:00:00.000Z");
            const uploadDate = new Date("2026-05-12T04:30:00.000Z");
            const current = await createTestActivityProgress(
                studentId,
                phqResultId,
                9,
                { status: "in_progress", teacherId: USERS.classTeacher.id },
            );

            await Promise.all([
                prisma.activityProgress.update({
                    where: { id: current.id },
                    data: { scheduledDate: selectedDate },
                }),
                prisma.worksheetUpload.create({
                    data: {
                        activityProgressId: current.id,
                        worksheetNumber: 1,
                        fileName: "worksheet-selected-date.jpg",
                        fileUrl: "/api/uploads/worksheet-selected-date.jpg",
                        fileType: "image/jpeg",
                        fileSize: 1024,
                        uploadedById: USERS.classTeacher.id,
                        uploadedAt: uploadDate,
                    },
                }),
            ]);

            mockSession(USERS.classTeacher);
            const result = await confirmActivityComplete(current.id);

            expect(result.success).toBe(true);

            const updated = await prisma.activityProgress.findUnique({
                where: { id: current.id },
                select: { scheduledDate: true, teacherId: true },
            });

            expect(updated?.scheduledDate?.toISOString()).toBe(
                selectedDate.toISOString(),
            );
            expect(updated?.teacherId).toBe(USERS.classTeacher.id);
        });

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


