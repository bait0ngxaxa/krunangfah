"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { calculateRiskLevel } from "@/lib/utils/phq-scoring";
import { revalidatePath } from "next/cache";
import type { ImportResult } from "./types";

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
                // Find or create student by studentId + schoolId
                let student = await prisma.student.findUnique({
                    where: {
                        studentId_schoolId: {
                            studentId: studentData.studentId,
                            schoolId,
                        },
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

                // Check for duplicate assessment in same round
                const existingResult = await prisma.phqResult.findFirst({
                    where: {
                        studentId: student.id,
                        academicYearId,
                        assessmentRound,
                    },
                });

                if (existingResult) {
                    errors.push(
                        `${studentData.firstName} ${studentData.lastName} (${studentData.studentId}): มีข้อมูลการประเมินครั้งที่ ${assessmentRound} อยู่แล้ว`,
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
                        await import("../activity");
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

        const failedCount = errors.length;

        let message = "";
        if (errors.length === 0) {
            // All success
            message =
                skippedCount > 0
                    ? `นำเข้าสำเร็จ ${importedCount} คน (ข้าม ${skippedCount} คนที่ไม่ใช่ห้องที่คุณดูแล)`
                    : `นำเข้าสำเร็จทั้งหมด ${importedCount} คน`;
        } else {
            // Partial success
            if (importedCount > 0) {
                message = `นำเข้าสำเร็จ ${importedCount} คน, ไม่สามารถนำเข้าได้ ${failedCount} คน (มีข้อมูลการประเมินอยู่แล้ว)`;
            } else {
                message = `ไม่สามารถนำเข้าได้ทั้งหมด ${failedCount} คน (มีข้อมูลการประเมินอยู่แล้ว)`;
            }
        }

        return {
            success: errors.length === 0,
            message,
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
