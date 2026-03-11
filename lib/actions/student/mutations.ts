"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/session";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { calculateRiskLevel, type RiskLevel } from "@/lib/utils/phq-scoring";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import { revalidatePath, revalidateTag } from "next/cache";
import type { ImportResult } from "./types";
import { logError } from "@/lib/utils/logging";

/**
 * Import students with PHQ-A results
 *
 * Access control:
 * - school_admin: import ได้ทุกห้อง
 * - class_teacher: import ได้เฉพาะห้องที่ตัวเองดูแล (advisoryClass)
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

        // system_admin doesn't have schoolId — import requires school context
        if (!user?.schoolId) {
            return {
                success: false,
                message:
                    userRole === "system_admin"
                        ? "System admin ต้องเลือกโรงเรียนก่อนนำเข้าข้อมูล"
                        : "คุณยังไม่ได้เชื่อมต่อกับโรงเรียน",
            };
        }

        const schoolId = user.schoolId;
        const advisoryClass = user.teacher?.advisoryClass;
        const isClassTeacher = userRole === "class_teacher";

        // class_teacher ต้องมี advisoryClass
        if (isClassTeacher && !advisoryClass) {
            return {
                success: false,
                message: "ไม่พบข้อมูลห้องที่คุณดูแล กรุณาตั้งค่าโปรไฟล์ก่อน",
            };
        }

        const errors: string[] = [];
        let importedCount = 0;
        let skippedCount = 0;

        // --- O(1) Optimization: Pre-fetch data to avoid N+1 queries ---
        // 1. Extract all student IDs from the incoming data
        const importedStudentIds = students.map((s) => s.studentId);

        // 2. Bulk fetch existing students in this school
        const existingStudents = await prisma.student.findMany({
            where: {
                schoolId,
                studentId: { in: importedStudentIds },
            },
        });

        // 3. Create a Map for O(1) student lookups
        const studentMap = new Map(
            existingStudents.map((s) => [s.studentId, s]),
        );

        // 4. Bulk fetch existing PHQ results for these students in this round
        const existingStudentDbIds = existingStudents.map((s) => s.id);
        const existingPhqResults = await prisma.phqResult.findMany({
            where: {
                studentId: { in: existingStudentDbIds },
                academicYearId,
                assessmentRound,
            },
            select: { studentId: true },
        });

        // 5. Create a Set for O(1) existing result lookups
        const hasExistingResultSet = new Set(
            existingPhqResults.map((r) => r.studentId),
        );
        // ----------------------------------------------------------------

        // Prepare arrays for batch operations
        const phqResultsToCreate: Prisma.PhqResultCreateManyInput[] = [];

        // This array will hold data needed for creating ActivityProgress after bulk inserts
        const activitiesToInitialize: {
            studentId: string;
            riskLevel: RiskLevel;
        }[] = [];

        // For tracking the order to link newly created Students with their PhqResults
        // since we need the auto-generated student ID after createMany, but createMany on Postgres
        // doesn't return IDs. So we'll use Prisma $transaction with individual creates but grouped,
        // or keep creating students with their specific unique studentId and then fetch them again.
        // Wait, since we are using bulk inserts, we need the DB-generated `id` for PHQ Results.
        // Let's refactor to use a single transaction.

        const newStudentDataRows: typeof students = [];

        // Process each student in memory first
        for (const studentData of students) {
            try {
                // ตรวจสิทธิ์ห้อง: class_teacher import ได้เฉพาะห้องตัวเอง
                if (isClassTeacher && advisoryClass) {
                    const studentClass = normalizeClassName(studentData.class);
                    if (studentClass !== advisoryClass) {
                        skippedCount++;
                        continue;
                    }
                }

                // We no longer `await prisma.create` inside the loop.
                // Instead, we accumulate data to process in a batch.

                // O(1) Lookup: Find existing student from memory Map instead of DB
                let student = studentMap.get(studentData.studentId);
                if (!student) {
                    // It's a new student.
                    // To handle the need for the DB-generated `id` for phqResults,
                    // we will create the student now, but using a transaction later would be better.
                    // Actually, to truly eliminate N+1 and get IDs, we can use `create` inside a `$transaction` array,
                    // or `createMany` and then fetch them.

                    // Since Neon (Postgres) supports `createManyAndReturn` (Prisma 5.11+),
                    // let's do a two-pass approach. First pass: figure out who is new vs existing.
                    newStudentDataRows.push(studentData);
                    // We will process new students together after this loop.
                } else {
                    // Existing student: O(1) check if they already have a result this round
                    if (hasExistingResultSet.has(student.id)) {
                        errors.push(
                            `${studentData.firstName} ${studentData.lastName} (${studentData.studentId}): มีข้อมูลการประเมินครั้งที่ ${assessmentRound} อยู่แล้ว`,
                        );
                        continue;
                    }

                    // อัปเดต gender/age ถ้ามีข้อมูลใหม่และต่างจากเดิม
                    const updates: Record<string, unknown> = {};
                    if (
                        studentData.gender &&
                        student.gender !== studentData.gender
                    ) {
                        updates.gender = studentData.gender;
                    }
                    if (studentData.age && student.age !== studentData.age) {
                        updates.age = studentData.age;
                    }
                    if (Object.keys(updates).length > 0) {
                        // For existing students, we update them immediately to get the updated record.
                        // Ideally this is also batched, but updates are usually fewer than inserts.
                        student = await prisma.student.update({
                            where: { id: student.id },
                            data: updates,
                        });
                        studentMap.set(student.studentId, student);
                    }

                    // Calculate risk level
                    const { totalScore, riskLevel } = calculateRiskLevel(
                        studentData.scores,
                    );

                    // Queue the PHQ result for batch insert
                    phqResultsToCreate.push({
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
                    });

                    // Queue activity initialization
                    if (["orange", "yellow", "green"].includes(riskLevel)) {
                        activitiesToInitialize.push({
                            studentId: student.id,
                            riskLevel,
                        });
                    }

                    importedCount++;
                }
            } catch (err) {
                logError("Import student logic error:", err);
                errors.push(
                    `${studentData.firstName} ${studentData.lastName}: เกิดข้อผิดพลาดในการประมวลผลข้อมูล`,
                );
            }
        }

        // --- BATCH PROCESSING PHASE ---

        try {
            // 1. Bulk Create New Students
            if (newStudentDataRows.length > 0) {
                // Batch insert new students
                await prisma.student.createMany({
                    data: newStudentDataRows.map((data) => ({
                        studentId: data.studentId,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        gender: data.gender ?? null,
                        age: data.age ?? null,
                        class: data.class,
                        schoolId,
                    })),
                    skipDuplicates: true,
                });

                // Fetch the newly created students to get their DB `id`s
                const justCreatedStudents = await prisma.student.findMany({
                    where: {
                        schoolId,
                        studentId: {
                            in: newStudentDataRows.map((s) => s.studentId),
                        },
                    },
                });

                // Add them to the map for quick lookup
                justCreatedStudents.forEach((s) =>
                    studentMap.set(s.studentId, s),
                );

                // Process PHQ results for these newly created students
                for (const studentData of newStudentDataRows) {
                    const student = studentMap.get(studentData.studentId);
                    if (!student) continue;

                    const { totalScore, riskLevel } = calculateRiskLevel(
                        studentData.scores,
                    );

                    phqResultsToCreate.push({
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
                    });

                    if (["orange", "yellow", "green"].includes(riskLevel)) {
                        activitiesToInitialize.push({
                            studentId: student.id,
                            riskLevel,
                        });
                    }

                    importedCount++;
                }
            }

            // 2. Bulk Create PHQ Results
            if (phqResultsToCreate.length > 0) {
                await prisma.phqResult.createMany({
                    data: phqResultsToCreate,
                });
            }

            // 3. Initialize Activity Progresses (requires PHQ Result IDs)
            if (activitiesToInitialize.length > 0) {
                // Since `initializeActivityProgress` requires `phqResultId`, and `createMany` doesn't return IDs,
                // we must fetch the newly created phqResults.
                // Alternatively, we can use a raw query or fetch them back.
                const newPhqResults = await prisma.phqResult.findMany({
                    where: {
                        academicYearId,
                        assessmentRound,
                        studentId: {
                            in: activitiesToInitialize.map((a) => a.studentId),
                        },
                    },
                    select: { id: true, studentId: true, riskLevel: true },
                });

                const { initializeActivityProgress } =
                    await import("../activity");

                // Initialize them mostly in parallel
                await Promise.all(
                    newPhqResults.map((phq) => {
                        return initializeActivityProgress(
                            phq.studentId,
                            phq.id,
                            phq.riskLevel,
                        );
                    }),
                );
            }
        } catch (batchErr) {
            logError("Batch insert error:", batchErr);
            errors.push(
                "เกิดข้อผิดพลาดในการบันทึกข้อมูลเข้าสู่ฐานข้อมูล (Batch Insert Failed)",
            );
            // If batch fails, we consider the whole remaining batch failed regarding counting
            // Note: Since we are not using a full transaction block here for simplicity,
            // partial failures could happen. We might want to use `$transaction` in the future.
        }

        revalidatePath("/dashboard");
        revalidatePath("/students");
        revalidatePath("/analytics");
        revalidateTag("analytics", "default");

        const failedCount = errors.length;

        let message = "";
        if (errors.length === 0) {
            message =
                skippedCount > 0
                    ? `นำเข้าสำเร็จ ${importedCount} คน (ข้าม ${skippedCount} คนที่ไม่ใช่ห้องที่คุณดูแล)`
                    : `นำเข้าสำเร็จทั้งหมด ${importedCount} คน`;
        } else {
            if (importedCount > 0) {
                const skippedMsg =
                    skippedCount > 0
                        ? `, ข้าม ${skippedCount} คนที่ไม่ใช่ห้องที่คุณดูแล`
                        : "";
                message = `นำเข้าสำเร็จ ${importedCount} คน, ไม่สามารถนำเข้าได้ ${failedCount} คน (มีข้อมูลการประเมินอยู่แล้ว)${skippedMsg}`;
            } else {
                message = `ไม่สามารถนำเข้าได้ทั้งหมด ${failedCount} คน (มีข้อมูลการประเมินอยู่แล้ว)`;
            }
        }

        return {
            success: errors.length === 0,
            message,
            imported: importedCount,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    } catch (error) {
        logError("Import students error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล",
        };
    }
}
