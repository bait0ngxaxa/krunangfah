/**
 * Test Data Seed Factory
 *
 * Creates test data in the real database for integration tests.
 * Uses Prisma's auto-generated CUIDs (important: Zod validates .cuid())
 */

import { prisma } from "@/lib/prisma";
import type { MockUser } from "./auth-mock";

// Track created IDs for cleanup
const createdIds = {
    schools: [] as string[],
    users: [] as string[],
    teachers: [] as string[],
    students: [] as string[],
    academicYears: [] as string[],
    phqResults: [] as string[],
    activityProgress: [] as string[],
    counselingSessions: [] as string[],
    passwordResetTokens: [] as string[],
};

export function getCreatedIds() {
    return createdIds;
}

/**
 * Create a test school
 */
export async function createTestSchool(overrides: { name?: string } = {}) {
    const school = await prisma.school.create({
        data: {
            name: overrides.name ?? "โรงเรียนทดสอบ",
            province: "กรุงเทพมหานคร",
        },
    });
    createdIds.schools.push(school.id);
    return school;
}

/**
 * Create a test academic year
 */
export async function createTestAcademicYear(
    overrides: { year?: number; semester?: number } = {},
) {
    const year = overrides.year ?? 2567;
    const semester = overrides.semester ?? 1;

    // Check if exists first (unique constraint)
    const existing = await prisma.academicYear.findUnique({
        where: { year_semester: { year, semester } },
    });
    if (existing) {
        createdIds.academicYears.push(existing.id);
        return existing;
    }

    const ay = await prisma.academicYear.create({
        data: {
            year,
            semester,
            startDate: new Date("2024-05-01"),
            endDate: new Date("2024-10-31"),
            isCurrent: false,
        },
    });
    createdIds.academicYears.push(ay.id);
    return ay;
}

/**
 * Create a test user (matching mock auth user IDs)
 */
export async function createTestUser(mockUser: MockUser, schoolId: string) {
    // Check if already exists by id OR email
    const existingById = await prisma.user.findUnique({
        where: { id: mockUser.id },
    });
    if (existingById) return existingById;

    const existingByEmail = await prisma.user.findUnique({
        where: { email: mockUser.email },
    });
    if (existingByEmail) return existingByEmail;

    const user = await prisma.user.create({
        data: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            role: mockUser.role,
            schoolId: mockUser.role !== "system_admin" ? schoolId : null,
            password: "$2a$10$fakehashfortesting",
        },
    });
    createdIds.users.push(user.id);
    return user;
}

/**
 * Create a test teacher profile
 */
export async function createTestTeacher(
    userId: string,
    academicYearId: string,
    overrides: { advisoryClass?: string } = {},
) {
    const existing = await prisma.teacher.findUnique({
        where: { userId },
    });
    if (existing) return existing;

    const teacher = await prisma.teacher.create({
        data: {
            userId,
            firstName: "ครูทดสอบ",
            lastName: "นามสกุลทดสอบ",
            age: 30,
            advisoryClass: overrides.advisoryClass ?? "ม.2/5",
            academicYearId,
            schoolRole: "ครูประจำชั้น",
            projectRole: "care",
        },
    });
    createdIds.teachers.push(teacher.id);
    return teacher;
}

/**
 * Create a test student (let Prisma auto-generate CUID)
 */
export async function createTestStudent(
    schoolId: string,
    overrides: {
        studentId?: string;
        class?: string;
        firstName?: string;
    } = {},
) {
    const student = await prisma.student.create({
        data: {
            studentId: overrides.studentId ?? `S${Date.now()}`,
            firstName: overrides.firstName ?? "นักเรียนทดสอบ",
            lastName: "นามสกุล",
            class: overrides.class ?? "ม.2/5",
            schoolId,
        },
    });
    createdIds.students.push(student.id);
    return student;
}

/**
 * Create a test PHQ result
 */
export async function createTestPhqResult(
    studentId: string,
    academicYearId: string,
    importedById: string,
    overrides: { riskLevel?: string; totalScore?: number } = {},
) {
    const phq = await prisma.phqResult.create({
        data: {
            studentId,
            academicYearId,
            importedById,
            assessmentRound: 1,
            q1: 2,
            q2: 2,
            q3: 2,
            q4: 1,
            q5: 1,
            q6: 0,
            q7: 0,
            q8: 0,
            q9: 0,
            q9a: false,
            q9b: false,
            totalScore: overrides.totalScore ?? 8,
            riskLevel: (overrides.riskLevel as "yellow") ?? "yellow",
        },
    });
    createdIds.phqResults.push(phq.id);
    return phq;
}

/**
 * Create a test activity progress
 */
export async function createTestActivityProgress(
    studentId: string,
    phqResultId: string,
    activityNumber: number,
    overrides: {
        status?: string;
        teacherId?: string;
    } = {},
) {
    const ap = await prisma.activityProgress.create({
        data: {
            studentId,
            phqResultId,
            activityNumber,
            status: (overrides.status as "locked") ?? "locked",
            teacherId: overrides.teacherId ?? null,
            unlockedAt:
                overrides.status && overrides.status !== "locked"
                    ? new Date()
                    : null,
        },
    });
    createdIds.activityProgress.push(ap.id);
    return ap;
}
