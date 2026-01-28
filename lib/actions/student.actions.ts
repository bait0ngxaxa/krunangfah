"use server";

import { prisma } from "@/lib/prisma";
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
        const userRole = session.user.role;

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
        const advisoryClass = user.teacher?.advisoryClass;
        const errors: string[] = [];
        let importedCount = 0;
        let skippedCount = 0;

        // Process each student
        for (const studentData of students) {
            try {
                // Filter by advisory class for class_teacher
                if (
                    userRole === "class_teacher" &&
                    advisoryClass &&
                    studentData.class !== advisoryClass
                ) {
                    skippedCount++;
                    continue;
                }
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
                await prisma.phqResult.create({
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

        if (!teacher) {
            return [];
        }

        // school_admin sees all students in school
        // class_teacher sees only their advisory class
        const whereClause: { schoolId: string; class?: string } = {
            schoolId: teacher.schoolId,
        };

        if (user.role === "class_teacher") {
            whereClause.class = teacher.advisoryClass;
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

        if (!teacher) {
            return [];
        }

        // Build where clause with school filter
        const whereClause: {
            schoolId: string;
            class?: string;
            OR?: Array<{
                firstName?: { contains: string; mode: "insensitive" };
                lastName?: { contains: string; mode: "insensitive" };
                studentId?: { contains: string; mode: "insensitive" };
            }>;
        } = {
            schoolId: teacher.schoolId,
            OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { studentId: { contains: query, mode: "insensitive" } },
            ],
        };

        // class_teacher sees only their advisory class
        if (user.role === "class_teacher") {
            whereClause.class = teacher.advisoryClass;
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

        if (!teacher) {
            return null;
        }

        // Build where clause with security check
        const whereClause: { id: string; schoolId: string; class?: string } = {
            id: studentId,
            schoolId: teacher.schoolId, // Security: same school only
        };

        // class_teacher sees only their advisory class
        if (user.role === "class_teacher") {
            whereClause.class = teacher.advisoryClass;
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
