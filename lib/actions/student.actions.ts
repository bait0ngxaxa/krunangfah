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
): Promise<ImportResult> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        // Get user's school
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true },
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

        // Process each student
        for (const studentData of students) {
            try {
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

                // Create PHQ result
                await prisma.phqResult.create({
                    data: {
                        studentId: student.id,
                        academicYearId,
                        importedById: userId,
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

        return {
            success: errors.length === 0,
            message:
                errors.length === 0
                    ? `นำเข้าข้อมูลสำเร็จ ${importedCount} คน`
                    : `นำเข้าข้อมูลสำเร็จ ${importedCount} คน แต่มีข้อผิดพลาด ${errors.length} รายการ`,
            imported: importedCount,
            errors,
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
