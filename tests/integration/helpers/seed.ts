/**
 * Test Data Seed Factory
 *
 * Creates test data in the real database for integration tests.
 * Uses Prisma's auto-generated CUIDs (important: Zod validates .cuid())
 */

import type { AcademicYear } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import type { MockUser } from "./auth-mock";

type FixtureModel = "schools" | "users" | "teachers" | "students" | "academicYears"
    | "phqResults" | "activityProgress" | "counselingSessions" | "passwordResetTokens";

export function createFixtureIds(): Record<FixtureModel, string[]> {
    return {
        schools: [],
        users: [],
        teachers: [],
        students: [],
        academicYears: [],
        phqResults: [],
        activityProgress: [],
        counselingSessions: [],
        passwordResetTokens: [],
    };
}

const createdIds = createFixtureIds();

export function getCreatedIds(): ReturnType<typeof createFixtureIds> {
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
    { year, semester = 1, startDate = new Date("2024-05-01"), endDate = new Date("2024-10-31") }:
        { year: number; semester?: number; startDate?: Date; endDate?: Date },
    ids = createdIds,
): Promise<AcademicYear> {
    // A duplicate term is a fixture collision. Never borrow an independently owned row.
    const ay = await prisma.academicYear.create({
        data: { year, semester, startDate, endDate, isCurrent: false },
    });
    ids.academicYears.push(ay.id);
    return ay;
}

/**
 * Create a test user (matching mock auth user IDs)
 */
export async function createTestUser(mockUser: MockUser, schoolId: string = "") {
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
    overrides: {
        riskLevel?: string;
        totalScore?: number;
        assessmentRound?: number;
        createdAt?: Date;
    } = {},
) {
    const phq = await prisma.phqResult.create({
        data: {
            studentId,
            academicYearId,
            importedById,
            assessmentRound: overrides.assessmentRound ?? 1,
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
            createdAt: overrides.createdAt,
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
