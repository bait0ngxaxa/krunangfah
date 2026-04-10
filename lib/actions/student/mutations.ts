"use server";

import { prisma } from "@/lib/prisma";
import { ActivityStatus, Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/session";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { calculateRiskLevel, type RiskLevel } from "@/lib/utils/phq-scoring";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import { ACTIVITY_INDICES } from "@/lib/actions/activity/constants";
import { revalidatePath } from "next/cache";
import type { ImportResult } from "./types";
import { logError } from "@/lib/utils/logging";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";

const ACTIVITY_INIT_RISK_LEVELS = new Set<RiskLevel>(["orange", "yellow", "green"]);

function getActivityNumbersByRiskLevel(riskLevel: RiskLevel): number[] {
    if (!Object.hasOwn(ACTIVITY_INDICES, riskLevel)) {
        return [];
    }
    return ACTIVITY_INDICES[riskLevel as keyof typeof ACTIVITY_INDICES];
}

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

        if (assessmentRound !== 1 && assessmentRound !== 2) {
            return {
                success: false,
                status: "error",
                message: "รอบการประเมินไม่ถูกต้อง",
            };
        }

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
                status: "error",
                message:
                    userRole === "system_admin"
                        ? "System admin ต้องเลือกโรงเรียนก่อนนำเข้าข้อมูล"
                        : "คุณยังไม่ได้เชื่อมต่อกับโรงเรียน",
            };
        }

        const schoolId = user.schoolId;
        const advisoryClass = user.teacher?.advisoryClass;
        const isClassTeacher = userRole === "class_teacher";

        if (isClassTeacher && !advisoryClass) {
            return {
                success: false,
                status: "error",
                message: "ไม่พบข้อมูลห้องที่คุณดูแล กรุณาตั้งค่าโปรไฟล์ก่อน",
            };
        }

        if (assessmentRound === 2) {
            const schoolRound1Count = await prisma.phqResult.count({
                where: {
                    academicYearId,
                    assessmentRound: 1,
                    student: { schoolId },
                },
            });

            if (schoolRound1Count === 0) {
                return {
                    success: false,
                    status: "error",
                    message:
                        "ปีการศึกษานี้ยังไม่มีข้อมูลการประเมินครั้งที่ 1 จึงยังนำเข้าครั้งที่ 2 ไม่ได้",
                };
            }
        }

        const errors: string[] = [];
        let skippedCount = 0;
        const seenStudentIds = new Set<string>();
        const eligibleRows: ParsedStudent[] = [];

        for (const studentData of students) {
            if (isClassTeacher && advisoryClass) {
                const studentClass = normalizeClassName(studentData.class);
                if (studentClass !== advisoryClass) {
                    skippedCount++;
                    continue;
                }
            }

            if (seenStudentIds.has(studentData.studentId)) {
                errors.push(
                    `${studentData.firstName} ${studentData.lastName} (${studentData.studentId}): พบรหัสนักเรียนซ้ำในไฟล์นำเข้า`,
                );
                continue;
            }

            seenStudentIds.add(studentData.studentId);
            eligibleRows.push(studentData);
        }

        const importedStudentIds = eligibleRows.map((row) => row.studentId);

        const txResult = await prisma.$transaction(async (tx) => {
            if (importedStudentIds.length === 0) {
                return {
                    importedCount: 0,
                    duplicateRoundErrors: [] as string[],
                };
            }

            await tx.student.createMany({
                data: eligibleRows.map((row) => ({
                    studentId: row.studentId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    gender: row.gender ?? null,
                    age: row.age ?? null,
                    class: row.class,
                    schoolId,
                })),
                skipDuplicates: true,
            });

            const scopedStudents = await tx.student.findMany({
                where: {
                    schoolId,
                    studentId: { in: importedStudentIds },
                },
            });

            const studentByStudentId = new Map(
                scopedStudents.map((student) => [student.studentId, student]),
            );

            const studentUpdates: Promise<unknown>[] = [];
            for (const row of eligibleRows) {
                const student = studentByStudentId.get(row.studentId);
                if (!student) {
                    continue;
                }

                const updates: { gender?: ParsedStudent["gender"]; age?: number } = {};
                if (row.gender && student.gender !== row.gender) {
                    updates.gender = row.gender;
                }
                if (typeof row.age === "number" && student.age !== row.age) {
                    updates.age = row.age;
                }

                if (Object.keys(updates).length > 0) {
                    studentUpdates.push(
                        tx.student.update({
                            where: { id: student.id },
                            data: updates,
                        }),
                    );
                }
            }

            if (studentUpdates.length > 0) {
                await Promise.all(studentUpdates);
            }

            const existingPhqResults = await tx.phqResult.findMany({
                where: {
                    studentId: { in: scopedStudents.map((student) => student.id) },
                    academicYearId,
                    assessmentRound,
                },
                select: { studentId: true },
            });

            const hasExistingResultSet = new Set(
                existingPhqResults.map((result) => result.studentId),
            );
            const round1StudentSet =
                assessmentRound === 2
                    ? new Set(
                          (
                              await tx.phqResult.findMany({
                                  where: {
                                      studentId: {
                                          in: scopedStudents.map(
                                              (student) => student.id,
                                          ),
                                      },
                                      academicYearId,
                                      assessmentRound: 1,
                                  },
                                  select: { studentId: true },
                              })
                          ).map((result) => result.studentId),
                      )
                    : null;
            const duplicateRoundErrors: string[] = [];
            const phqResultsToCreate: Prisma.PhqResultCreateManyInput[] = [];

            for (const row of eligibleRows) {
                const student = studentByStudentId.get(row.studentId);
                if (!student) {
                    continue;
                }
                if (
                    assessmentRound === 2 &&
                    round1StudentSet &&
                    !round1StudentSet.has(student.id)
                ) {
                    duplicateRoundErrors.push(
                        `${row.firstName} ${row.lastName} (${row.studentId}): ยังไม่มีข้อมูลการประเมินครั้งที่ 1 สำหรับปีการศึกษานี้`,
                    );
                    continue;
                }
                if (hasExistingResultSet.has(student.id)) {
                    duplicateRoundErrors.push(
                        `${row.firstName} ${row.lastName} (${row.studentId}): มีข้อมูลการประเมินครั้งที่ ${assessmentRound} อยู่แล้ว`,
                    );
                    continue;
                }

                const { totalScore, riskLevel } = calculateRiskLevel(row.scores);
                phqResultsToCreate.push({
                    studentId: student.id,
                    academicYearId,
                    importedById: userId,
                    assessmentRound,
                    q1: row.scores.q1,
                    q2: row.scores.q2,
                    q3: row.scores.q3,
                    q4: row.scores.q4,
                    q5: row.scores.q5,
                    q6: row.scores.q6,
                    q7: row.scores.q7,
                    q8: row.scores.q8,
                    q9: row.scores.q9,
                    q9a: row.scores.q9a,
                    q9b: row.scores.q9b,
                    totalScore,
                    riskLevel,
                });
            }

            if (phqResultsToCreate.length > 0) {
                await tx.phqResult.createMany({
                    data: phqResultsToCreate,
                });

                const createdPhqResults = await tx.phqResult.findMany({
                    where: {
                        studentId: { in: phqResultsToCreate.map((record) => record.studentId) },
                        academicYearId,
                        assessmentRound,
                    },
                    select: {
                        id: true,
                        studentId: true,
                        riskLevel: true,
                    },
                });

                const activityProgressRows: Prisma.ActivityProgressCreateManyInput[] = [];
                for (const phqResult of createdPhqResults) {
                    if (!ACTIVITY_INIT_RISK_LEVELS.has(phqResult.riskLevel as RiskLevel)) {
                        continue;
                    }

                    const activityNumbers = getActivityNumbersByRiskLevel(
                        phqResult.riskLevel as RiskLevel,
                    );
                    for (const [index, activityNumber] of activityNumbers.entries()) {
                        activityProgressRows.push({
                            studentId: phqResult.studentId,
                            phqResultId: phqResult.id,
                            activityNumber,
                            status:
                                index === 0
                                    ? ActivityStatus.in_progress
                                    : ActivityStatus.locked,
                            unlockedAt: index === 0 ? new Date() : null,
                        });
                    }
                }

                if (activityProgressRows.length > 0) {
                    await tx.activityProgress.createMany({
                        data: activityProgressRows,
                        skipDuplicates: true,
                    });
                }
            }

            return {
                importedCount: phqResultsToCreate.length,
                duplicateRoundErrors,
            };
        });

        errors.push(...txResult.duplicateRoundErrors);

        revalidatePath("/dashboard");
        revalidatePath("/students");
        revalidatePath("/analytics");
        revalidateAnalyticsCache(schoolId);

        const importedCount = txResult.importedCount;
        const failedCount = errors.length;

        let message = "";
        if (failedCount === 0) {
            message =
                skippedCount > 0
                    ? `นำเข้าสำเร็จ ${importedCount} คน (ข้าม ${skippedCount} คนที่ไม่ใช่ห้องที่คุณดูแล)`
                    : `นำเข้าสำเร็จทั้งหมด ${importedCount} คน`;
        } else if (importedCount > 0) {
            const skippedMsg =
                skippedCount > 0
                    ? `, ข้าม ${skippedCount} คนที่ไม่ใช่ห้องที่คุณดูแล`
                    : "";
            message = `นำเข้าสำเร็จ ${importedCount} คน, ไม่สามารถนำเข้าได้ ${failedCount} คน (ข้อมูลซ้ำหรือไม่ผ่านเงื่อนไข)${skippedMsg}`;
        } else {
            message = `ไม่สามารถนำเข้าได้ทั้งหมด ${failedCount} คน (ข้อมูลซ้ำหรือไม่ผ่านเงื่อนไข)`;
        }

        return {
            success: importedCount > 0,
            status:
                failedCount === 0
                    ? "success"
                    : importedCount > 0
                      ? "partial"
                      : "error",
            message,
            imported: importedCount,
            skipped: skippedCount,
            errors: failedCount > 0 ? errors : undefined,
        };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            logError("Import students transaction error:", error);
        } else {
            logError("Import students error:", error);
        }
        return {
            success: false,
            status: "error",
            message: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล",
        };
    }
}
