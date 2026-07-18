/**
 * Integration Test: updateStudentStatus
 *
 * Tests the new updateStudentStatus server action with real Prisma + mocked auth.
 * Covers: role authorization, status validation, same-status no-op,
 * and class count adjustment (expectedStudentCount via SchoolClassTerm).
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

const USERS = createMockUsers("sts");

const { updateStudentStatus } = await import(
    "@/lib/actions/student/mutations"
);

describe("Integration: updateStudentStatus", () => {
    let schoolId: string;
    let studentId: string;
    let secondStudentId: string;
    let academicYearId: string;
    let schoolClassId: string;

    const STUDENT_CLASS = "ม.2/7";
    const INITIAL_EXPECTED_COUNT = 30;

    beforeAll(async () => {
        const school = await createTestSchool();
        schoolId = school.id;

        const academicYear = await createTestAcademicYear({
            year: 2699,
            semester: 1,
        });
        academicYearId = academicYear.id;

        // Mark as current so getCurrentAcademicYearId finds it
        await prisma.academicYear.update({
            where: { id: academicYearId },
            data: { isCurrent: true },
        });

        USERS.classTeacher.schoolId = schoolId;
        USERS.schoolAdmin.schoolId = schoolId;

        await createTestUser(USERS.classTeacher, schoolId);
        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: STUDENT_CLASS,
        });

        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(USERS.systemAdmin);

        const student = await createTestStudent(schoolId, {
            class: STUDENT_CLASS,
        });
        studentId = student.id;
        const secondStudent = await createTestStudent(schoolId, {
            class: STUDENT_CLASS,
        });
        secondStudentId = secondStudent.id;

        // Create SchoolClass + SchoolClassTerm for count adjustment tests
        const schoolClass = await prisma.schoolClass.create({
            data: {
                schoolId,
                name: STUDENT_CLASS,
                expectedStudentCount: INITIAL_EXPECTED_COUNT,
            },
        });
        schoolClassId = schoolClass.id;

        await prisma.schoolClassTerm.create({
            data: {
                schoolClassId: schoolClass.id,
                academicYearId,
                expectedStudentCount: INITIAL_EXPECTED_COUNT,
            },
        });
    });

    afterAll(async () => {
        // Reset student status before cleanup
        await prisma.student
            .update({
                where: { id: studentId },
                data: { status: "ACTIVE", leftAt: null },
            })
            .catch(() => {});

        // Cleanup SchoolClassTerm and SchoolClass
        await prisma.schoolClassTerm
            .deleteMany({ where: { schoolClassId } })
            .catch(() => {});
        await prisma.schoolClass
            .delete({ where: { id: schoolClassId } })
            .catch(() => {});

        // Reset isCurrent
        await prisma.academicYear
            .update({
                where: { id: academicYearId },
                data: { isCurrent: false },
            })
            .catch(() => {});

        await cleanupAll();
    });

    describe("role authorization", () => {
        it("should allow school_admin to update status", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await updateStudentStatus(studentId, "GRADUATED");

            expect(result.success).toBe(true);

            // Reset for subsequent tests
            await prisma.student.update({
                where: { id: studentId },
                data: { status: "ACTIVE", leftAt: null },
            });
        });

        it("should allow class_teacher to update own advisory class student", async () => {
            mockSession(USERS.classTeacher);

            const result = await updateStudentStatus(studentId, "GRADUATED");

            expect(result.success).toBe(true);

            // Reset
            await prisma.student.update({
                where: { id: studentId },
                data: { status: "ACTIVE", leftAt: null },
            });
        });

        it("should deny system_admin", async () => {
            mockSession(USERS.systemAdmin);

            const result = await updateStudentStatus(studentId, "RESIGNED");

            expect(result.success).toBe(false);
            expect(result.message).toContain("ไม่มีสิทธิ์");
        });
    });

    describe("input validation", () => {
        it("should reject invalid status string", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await updateStudentStatus(
                studentId,
                "EXPELLED",
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain("สถานะนักเรียนไม่ถูกต้อง");
        });

        it("should reject lowercase status", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await updateStudentStatus(studentId, "active");

            expect(result.success).toBe(false);
        });
    });

    describe("student not found", () => {
        it("should return error for non-existent student", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await updateStudentStatus(
                "nonexistent-student-id",
                "RESIGNED",
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain("ไม่พบนักเรียน");
        });
    });

    describe("same status no-op", () => {
        it("should succeed without mutation when status unchanged", async () => {
            mockSession(USERS.schoolAdmin);

            // Student is ACTIVE, set to ACTIVE again
            const result = await updateStudentStatus(studentId, "ACTIVE");

            expect(result.success).toBe(true);
            expect(result.message).toContain("เป็นค่านี้อยู่แล้ว");
        });
    });

    describe("class count adjustment", () => {
        it("should decrement count when ACTIVE → RESIGNED (inactive)", async () => {
            mockSession(USERS.schoolAdmin);

            // Reset to known state
            await prisma.student.update({
                where: { id: studentId },
                data: { status: "ACTIVE", leftAt: null },
            });
            await prisma.schoolClassTerm.update({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId,
                        academicYearId,
                    },
                },
                data: { expectedStudentCount: INITIAL_EXPECTED_COUNT },
            });
            await prisma.schoolClass.update({
                where: { id: schoolClassId },
                data: { expectedStudentCount: INITIAL_EXPECTED_COUNT },
            });

            const result = await updateStudentStatus(studentId, "RESIGNED");
            expect(result.success).toBe(true);

            const term = await prisma.schoolClassTerm.findUnique({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId,
                        academicYearId,
                    },
                },
                select: { expectedStudentCount: true },
            });

            expect(term?.expectedStudentCount).toBe(
                INITIAL_EXPECTED_COUNT - 1,
            );

            // Verify student leftAt is set
            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: { leftAt: true, status: true },
            });
            expect(student?.status).toBe("RESIGNED");
            expect(student?.leftAt).not.toBeNull();
        });

        it("should increment count when RESIGNED → ACTIVE", async () => {
            mockSession(USERS.schoolAdmin);

            // Student is currently RESIGNED from previous test
            const currentTerm = await prisma.schoolClassTerm.findUnique({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId,
                        academicYearId,
                    },
                },
                select: { expectedStudentCount: true },
            });
            const beforeCount = currentTerm!.expectedStudentCount;

            const result = await updateStudentStatus(studentId, "ACTIVE");
            expect(result.success).toBe(true);

            const afterTerm = await prisma.schoolClassTerm.findUnique({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId,
                        academicYearId,
                    },
                },
                select: { expectedStudentCount: true },
            });

            expect(afterTerm?.expectedStudentCount).toBe(beforeCount + 1);

            // Verify leftAt is cleared
            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: { leftAt: true, status: true },
            });
            expect(student?.status).toBe("ACTIVE");
            expect(student?.leftAt).toBeNull();
        });

        it("should decrement count for ACTIVE → GRADUATED (inactive)", async () => {
            mockSession(USERS.schoolAdmin);

            const termBefore = await prisma.schoolClassTerm.findUnique({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId,
                        academicYearId,
                    },
                },
                select: { expectedStudentCount: true },
            });

            const result = await updateStudentStatus(studentId, "GRADUATED");
            expect(result.success).toBe(true);

            const termAfter = await prisma.schoolClassTerm.findUnique({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId,
                        academicYearId,
                    },
                },
                select: { expectedStudentCount: true },
            });

            expect(termAfter?.expectedStudentCount).toBe(
                (termBefore?.expectedStudentCount ?? 0) - 1,
            );

            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: { leftAt: true, status: true },
            });
            expect(student?.status).toBe("GRADUATED");
            expect(student?.leftAt).not.toBeNull();

            // Reset
            await prisma.student.update({
                where: { id: studentId },
                data: { status: "ACTIVE", leftAt: null },
            });
        });

        it("should preserve both decrements during concurrent mutations", async () => {
            mockSession(USERS.schoolAdmin);
            await prisma.student.updateMany({
                where: { id: { in: [studentId, secondStudentId] } },
                data: { status: "ACTIVE", leftAt: null },
            });
            await prisma.schoolClassTerm.update({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId,
                        academicYearId,
                    },
                },
                data: { expectedStudentCount: INITIAL_EXPECTED_COUNT },
            });
            await prisma.schoolClass.update({
                where: { id: schoolClassId },
                data: { expectedStudentCount: INITIAL_EXPECTED_COUNT },
            });

            const results = await Promise.all([
                updateStudentStatus(studentId, "RESIGNED"),
                updateStudentStatus(secondStudentId, "RESIGNED"),
            ]);

            expect(results.every((result) => result.success)).toBe(true);
            const [schoolClass, term] = await Promise.all([
                prisma.schoolClass.findUnique({
                    where: { id: schoolClassId },
                    select: { expectedStudentCount: true },
                }),
                prisma.schoolClassTerm.findUnique({
                    where: {
                        schoolClassId_academicYearId: {
                            schoolClassId,
                            academicYearId,
                        },
                    },
                    select: { expectedStudentCount: true },
                }),
            ]);

            expect(schoolClass?.expectedStudentCount).toBe(28);
            expect(term?.expectedStudentCount).toBe(28);
        });
    });

    describe("class_teacher scope restriction", () => {
        it("should deny class_teacher for student outside advisory class", async () => {
            mockSession(USERS.classTeacher);

            // Create a student in a different class
            const otherStudent = await prisma.student.create({
                data: {
                    studentId: `S-OTHER-${Date.now()}`,
                    firstName: "อื่น",
                    lastName: "ทดสอบ",
                    class: "ม.3/1",
                    schoolId,
                },
            });

            const result = await updateStudentStatus(
                otherStudent.id,
                "RESIGNED",
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain("ไม่พบนักเรียน");

            // Cleanup
            await prisma.student
                .delete({ where: { id: otherStudent.id } })
                .catch(() => {});
        });
    });
});
