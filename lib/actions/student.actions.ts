"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { calculateRiskLevel } from "@/lib/utils/phq-scoring";
import { revalidatePath } from "next/cache";

interface ImportResult {
    success: boolean;
    message: string;
    imported?: number;
    errors?: string[];
}

/**
 * Import students with PHQ-A results
 */
export async function importStudents(
    students: ParsedStudent[],
    academicYearId: string,
    assessmentRound: number = 1,
): Promise<ImportResult> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        // Get user's school and teacher profile
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                schoolId: true,
                teacher: {
                    select: {
                        advisoryClass: true,
                    },
                },
            },
        });

        if (!user?.schoolId) {
            return {
                success: false,
                message: "คุณยังไม่ได้เชื่อมต่อกับโรงเรียน",
            };
        }

        const schoolId = user.schoolId;
        const errors: string[] = [];
        let importedCount = 0;
        const skippedCount = 0;

        // Process each student
        for (const studentData of students) {
            try {
                // Removed advisory class check - class_teacher can import any student
                // and they will see them because of importedById check
                // Find or create student
                let student = await prisma.student.findFirst({
                    where: {
                        firstName: studentData.firstName,
                        lastName: studentData.lastName,
                        class: studentData.class,
                        schoolId,
                    },
                });

                if (!student) {
                    student = await prisma.student.create({
                        data: {
                            studentId: studentData.studentId,
                            firstName: studentData.firstName,
                            lastName: studentData.lastName,
                            class: studentData.class,
                            schoolId,
                        },
                    });
                }

                // Calculate risk level
                const { totalScore, riskLevel } = calculateRiskLevel(
                    studentData.scores,
                );

                // Check for duplicate assessment
                const existingResult = await prisma.phqResult.findFirst({
                    where: {
                        studentId: student.id,
                        academicYearId,
                        assessmentRound,
                    },
                });

                if (existingResult) {
                    errors.push(
                        `${studentData.firstName} ${studentData.lastName}: มีข้อมูลการประเมินครั้งที่ ${assessmentRound} อยู่แล้ว`,
                    );
                    continue;
                }

                // Create PHQ result
                const phqResult = await prisma.phqResult.create({
                    data: {
                        studentId: student.id,
                        academicYearId,
                        importedById: userId,
                        assessmentRound,
                        q1: studentData.scores.q1,
                        q2: studentData.scores.q2,
                        q3: studentData.scores.q3,
                        q4: studentData.scores.q4,
                        q5: studentData.scores.q5,
                        q6: studentData.scores.q6,
                        q7: studentData.scores.q7,
                        q8: studentData.scores.q8,
                        q9: studentData.scores.q9,
                        q9a: studentData.scores.q9a,
                        q9b: studentData.scores.q9b,
                        totalScore,
                        riskLevel,
                    },
                });

                // Initialize activity progress for orange/yellow/green students
                if (["orange", "yellow", "green"].includes(riskLevel)) {
                    const { initializeActivityProgress } =
                        await import("./activity.actions");
                    await initializeActivityProgress(
                        student.id,
                        phqResult.id,
                        riskLevel,
                    );
                }

                importedCount++;
            } catch (err) {
                console.error("Import student error:", err);
                errors.push(
                    `${studentData.firstName} ${studentData.lastName}: เกิดข้อผิดพลาด`,
                );
            }
        }

        revalidatePath("/dashboard");
        revalidatePath("/students");

        const successMessage =
            skippedCount > 0
                ? `นำเข้าสำเร็จ ${importedCount} คน (ข้าม ${skippedCount} คนที่ไม่ใช่ห้องที่คุณดูแล)`
                : `นำเข้าสำเร็จ ${importedCount} คน`;

        return {
            success: errors.length === 0,
            message:
                errors.length === 0
                    ? successMessage
                    : `นำเข้าสำเร็จบางส่วน: ${importedCount}/${students.length} คน`,
            imported: importedCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    } catch (error) {
        console.error("Import students error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล",
        };
    }
}

/**
 * Get students by class (for class_teacher) or all (for school_admin)
 */
export async function getStudents() {
    try {
        const session = await requireAuth();
        const user = session.user;

        // Get teacher profile
        const teacher = await prisma.teacher.findUnique({
            where: { userId: user.id },
        });

        // if (!teacher) {
        //    return [];
        // }

        // Fetch full user data to get schoolId if teacher profile is missing
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        // school_admin sees all students in school
        // class_teacher sees only students they imported
        const schoolId = teacher?.schoolId || dbUser?.schoolId;

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

        // Get teacher profile
        const teacher = await prisma.teacher.findUnique({
            where: { userId: user.id },
        });

        // if (!teacher) {
        //    return [];
        // }

        // Fetch full user data to get schoolId if teacher profile is missing
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        const schoolId = teacher?.schoolId || dbUser?.schoolId;

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

        // Get teacher profile
        const teacher = await prisma.teacher.findUnique({
            where: { userId: user.id },
        });

        // if (!teacher) {
        //     return null;
        // }

        // Fetch full user data to get schoolId if teacher profile is missing
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        const schoolId = teacher?.schoolId || dbUser?.schoolId;

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
