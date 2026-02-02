"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

/**
 * Get students by class (for class_teacher) or all (for school_admin)
 */
export async function getStudents() {
    try {
        const session = await requireAuth();
        const user = session.user;

        // Note: Teacher profile not needed anymore since we get schoolId from user

        // Fetch full user data to get schoolId if teacher profile is missing
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        // school_admin sees all students in school
        // class_teacher sees only students they imported
        const schoolId = dbUser?.schoolId;

        if (!schoolId) {
            return [];
        }

        const whereClause: Prisma.StudentWhereInput = {
            schoolId,
        };

        if (user.role === "class_teacher") {
            // Class teacher sees only students they imported
            whereClause.phqResults = {
                some: {
                    importedById: user.id,
                },
            };
        }

        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                phqResults: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: [{ class: "asc" }, { firstName: "asc" }],
        });

        return students;
    } catch (error) {
        console.error("Get students error:", error);
        return [];
    }
}

/**
 * Search students by name or student ID
 */
export async function searchStudents(query: string) {
    try {
        const session = await requireAuth();
        const user = session.user;

        // Note: Teacher profile not needed anymore since we get schoolId from user

        // Fetch full user data to get schoolId if teacher profile is missing
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        const schoolId = dbUser?.schoolId;

        if (!schoolId) {
            return [];
        }

        // Build where clause with school filter
        const whereClause: Prisma.StudentWhereInput = {
            schoolId,
            OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { studentId: { contains: query, mode: "insensitive" } },
            ],
        };

        // class_teacher sees only students they imported
        if (user.role === "class_teacher") {
            whereClause.phqResults = {
                some: {
                    importedById: user.id,
                },
            };
        }

        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                phqResults: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: [{ class: "asc" }, { firstName: "asc" }],
            take: 50, // Limit results
        });

        return students;
    } catch (error) {
        console.error("Search students error:", error);
        return [];
    }
}

/**
 * Get student detail with all PHQ results
 */
export async function getStudentDetail(studentId: string) {
    try {
        const session = await requireAuth();
        const user = session.user;

        // Note: Teacher profile not needed anymore since we get schoolId from user

        // Fetch full user data to get schoolId if teacher profile is missing
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        const schoolId = dbUser?.schoolId;

        if (!schoolId) {
            return null;
        }

        // Build where clause with security check
        const whereClause: Prisma.StudentWhereInput = {
            id: studentId,
            schoolId, // Security: same school only
        };

        // class_teacher sees only students they imported
        if (user.role === "class_teacher") {
            whereClause.phqResults = {
                some: {
                    importedById: user.id,
                },
            };
        }

        const student = await prisma.student.findFirst({
            where: whereClause,
            include: {
                phqResults: {
                    include: {
                        academicYear: true,
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        return student;
    } catch (error) {
        console.error("Get student detail error:", error);
        return null;
    }
}
