"use server";

import { prisma } from "@/lib/prisma";
import { ActivityStatus, Prisma, StudentStatus } from "@prisma/client";
import { requireAuth } from "@/lib/session";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { calculateRiskLevel, type RiskLevel } from "@/lib/utils/phq-scoring";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import { ACTIVITY_INDICES } from "@/lib/actions/activity/constants";
import { revalidatePath } from "next/cache";
import type { ImportResult } from "./types";
import { logError } from "@/lib/utils/logging";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/actions/school-setup.actions";

const ACTIVITY_INIT_RISK_LEVELS = new Set<RiskLevel>(["orange", "yellow", "green"]);
const COUNT_EXCLUDED_STUDENT_STATUSES = new Set<StudentStatus>([
    StudentStatus.RESIGNED,
    StudentStatus.TRANSFERRED,
]);

interface UpdateStudentStatusResult {
    success: boolean;
    message: string;
}

function getActivityNumbersByRiskLevel(riskLevel: RiskLevel): number[] {
    if (!Object.hasOwn(ACTIVITY_INDICES, riskLevel)) {
        return [];
    }
    return ACTIVITY_INDICES[riskLevel as keyof typeof ACTIVITY_INDICES];
}

function isInactiveStudentStatus(status: StudentStatus): boolean {
    return COUNT_EXCLUDED_STUDENT_STATUSES.has(status);
}

async function getCurrentAcademicYearId(): Promise<string | null> {
    const currentAcademicYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        select: { id: true },
    });

    if (currentAcademicYear) return currentAcademicYear.id;

    const latestAcademicYear = await prisma.academicYear.findFirst({
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        select: { id: true },
    });

    return latestAcademicYear?.id ?? null;
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
        const resolvedAcademicYearId =
            await ensureSchoolClassTermsForAcademicYear(
                schoolId,
                academicYearId,
            );

        if (!resolvedAcademicYearId) {
            return {
                success: false,
                status: "error",
                message: "ไม่พบปีการศึกษาที่ต้องการนำเข้า",
            };
        }

        const schoolClasses = await prisma.schoolClass.findMany({
            where: { schoolId },
            select: { name: true },
        });
        const validClassSet = new Set(
            schoolClasses.map((schoolClass) =>
                normalizeClassName(schoolClass.name),
            ),
        );

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
                    academicYearId: resolvedAcademicYearId,
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
        const seenNationalIds = new Set<string>();
        const eligibleRows: ParsedStudent[] = [];

        for (const studentData of students) {
            const studentClass = normalizeClassName(studentData.class);
            if (!validClassSet.has(studentClass)) {
                skippedCount++;
                continue;
            }

            if (isClassTeacher && advisoryClass) {
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
            if (seenNationalIds.has(studentData.nationalId)) {
                errors.push(
                    `${studentData.firstName} ${studentData.lastName} (${studentData.studentId}): พบเลขบัตรประชาชนซ้ำในไฟล์นำเข้า`,
                );
                continue;
            }

            seenStudentIds.add(studentData.studentId);
            seenNationalIds.add(studentData.nationalId);
            eligibleRows.push(studentData);
        }

        const importedStudentIds = eligibleRows.map((row) => row.studentId);
        const importedNationalIds = eligibleRows.map((row) => row.nationalId);

        const txResult = await prisma.$transaction(async (tx) => {
            if (importedStudentIds.length === 0) {
                return {
                    importedCount: 0,
                    duplicateRoundErrors: [] as string[],
                };
            }

            const existingStudentsByNationalId = await tx.student.findMany({
                where: {
                    nationalId: { in: importedNationalIds },
                },
                select: {
                    id: true,
                    schoolId: true,
                    studentId: true,
                    nationalId: true,
                    firstName: true,
                    lastName: true,
                },
            });

            const studentByNationalId = new Map(
                existingStudentsByNationalId
                    .filter(
                        (
                            student,
                        ): student is typeof student & { nationalId: string } =>
                            typeof student.nationalId === "string",
                    )
                    .map((student) => [student.nationalId, student]),
            );
            const existingStudentsByStudentId = await tx.student.findMany({
                where: {
                    schoolId,
                    studentId: { in: importedStudentIds },
                },
                select: {
                    id: true,
                    schoolId: true,
                    studentId: true,
                    nationalId: true,
                },
            });
            const existingStudentByStudentId = new Map(
                existingStudentsByStudentId.map((student) => [
                    student.studentId,
                    student,
                ]),
            );

            const rowsSafeToImport = eligibleRows.filter((row) => {
                const nationalIdOwner = studentByNationalId.get(row.nationalId);
                const studentIdOwner = existingStudentByStudentId.get(
                    row.studentId,
                );

                if (nationalIdOwner && nationalIdOwner.schoolId !== schoolId) {
                    errors.push(
                        `${row.firstName} ${row.lastName} (${row.studentId}): เลขบัตรประชาชนซ้ำกับข้อมูลที่มีในระบบ`,
                    );
                    return false;
                }

                if (
                    nationalIdOwner &&
                    studentIdOwner &&
                    nationalIdOwner.id !== studentIdOwner.id
                ) {
                    errors.push(
                        `${row.firstName} ${row.lastName} (${row.studentId}): เลขบัตรประชาชนซ้ำกับนักเรียนคนอื่นในระบบ`,
                    );
                    return false;
                }

                return true;
            });

            if (rowsSafeToImport.length === 0) {
                return {
                    importedCount: 0,
                    duplicateRoundErrors: [] as string[],
                };
            }

            await tx.student.createMany({
                data: rowsSafeToImport.map((row) => ({
                    studentId: row.studentId,
                    nationalId: row.nationalId,
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
                    OR: [
                        {
                            studentId: {
                                in: rowsSafeToImport.map((row) => row.studentId),
                            },
                        },
                        {
                            nationalId: {
                                in: rowsSafeToImport.map((row) => row.nationalId),
                            },
                        },
                    ],
                },
            });

            const studentByStudentId = new Map(
                scopedStudents.map((student) => [student.studentId, student]),
            );
            const scopedStudentByNationalId = new Map(
                scopedStudents
                    .filter(
                        (
                            student,
                        ): student is typeof student & { nationalId: string } =>
                            typeof student.nationalId === "string",
                    )
                    .map((student) => [student.nationalId, student]),
            );

            const studentUpdates: Promise<unknown>[] = [];
            for (const row of rowsSafeToImport) {
                const student =
                    studentByStudentId.get(row.studentId) ??
                    scopedStudentByNationalId.get(row.nationalId);
                if (!student) {
                    continue;
                }

                const updates: {
                    age?: number;
                    gender?: ParsedStudent["gender"];
                    nationalId?: string;
                } = {};
                if (student.nationalId !== row.nationalId) {
                    updates.nationalId = row.nationalId;
                }
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
                    academicYearId: resolvedAcademicYearId,
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
                                      academicYearId: resolvedAcademicYearId,
                                      assessmentRound: 1,
                                  },
                                  select: { studentId: true },
                              })
                          ).map((result) => result.studentId),
                      )
                    : null;
            const duplicateRoundErrors: string[] = [];
            const phqResultsToCreate: Prisma.PhqResultCreateManyInput[] = [];

            for (const row of rowsSafeToImport) {
                const student =
                    studentByStudentId.get(row.studentId) ??
                    scopedStudentByNationalId.get(row.nationalId);
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
                    academicYearId: resolvedAcademicYearId,
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
                        academicYearId: resolvedAcademicYearId,
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
        const skippedReason = isClassTeacher
            ? "ไม่ใช่ห้องที่คุณดูแล หรือยังไม่มีห้องเรียนดังกล่าวในระบบ"
            : "ยังไม่มีห้องเรียนดังกล่าวถูกสร้างไว้ในระบบ";

        if (importedCount === 0 && skippedCount > 0) {
            message = `ไม่สามารถนำเข้าได้ เนื่องจากนักเรียน ${skippedCount} คน${skippedReason}`;
        } else if (failedCount === 0) {
            message =
                skippedCount > 0
                    ? `นำเข้าสำเร็จ ${importedCount} คน (ข้าม ${skippedCount} คนที่${skippedReason})`
                    : `นำเข้าสำเร็จทั้งหมด ${importedCount} คน`;
        } else if (importedCount > 0) {
            const skippedMsg =
                skippedCount > 0
                    ? `, ข้าม ${skippedCount} คนที่${skippedReason}`
                    : "";
            message = `นำเข้าสำเร็จ ${importedCount} คน, ไม่สามารถนำเข้าได้ ${failedCount} คน (ข้อมูลซ้ำหรือไม่ผ่านเงื่อนไข)${skippedMsg}`;
        } else {
            message = `ไม่สามารถนำเข้าได้ทั้งหมด ${failedCount} คน (ข้อมูลซ้ำหรือไม่ผ่านเงื่อนไข)`;
        }

        return {
            success: importedCount > 0,
            status:
                failedCount === 0 && skippedCount === 0
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

export async function updateStudentStatus(
    studentId: string,
    status: string,
): Promise<UpdateStudentStatusResult> {
    try {
        const session = await requireAuth();
        const userRole = session.user.role;

        if (userRole !== "school_admin" && userRole !== "class_teacher") {
            return {
                success: false,
                message: "คุณไม่มีสิทธิ์เปลี่ยนสถานะนักเรียน",
            };
        }

        const parsedStatus = Object.values(StudentStatus).find(
            (value) => value === status,
        );
        if (!parsedStatus) {
            return { success: false, message: "สถานะนักเรียนไม่ถูกต้อง" };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                schoolId: true,
                teacher: { select: { advisoryClass: true } },
            },
        });

        if (!user?.schoolId) {
            return { success: false, message: "ไม่พบโรงเรียนของคุณ" };
        }

        const student = await prisma.student.findFirst({
            where: {
                id: studentId,
                schoolId: user.schoolId,
                ...(userRole === "class_teacher"
                    ? { class: user.teacher?.advisoryClass ?? "" }
                    : {}),
            },
            select: {
                id: true,
                class: true,
                status: true,
                schoolId: true,
            },
        });

        if (!student) {
            return { success: false, message: "ไม่พบนักเรียนที่ต้องการแก้ไข" };
        }

        if (student.status === parsedStatus) {
            return { success: true, message: "สถานะนักเรียนเป็นค่านี้อยู่แล้ว" };
        }

        const academicYearId = await getCurrentAcademicYearId();
        const oldStatusInactive = isInactiveStudentStatus(student.status);
        const newStatusInactive = isInactiveStudentStatus(parsedStatus);
        const expectedCountDelta =
            oldStatusInactive === newStatusInactive
                ? 0
                : newStatusInactive
                  ? -1
                  : 1;

        await prisma.$transaction(async (tx) => {
            await tx.student.update({
                where: { id: student.id },
                data: {
                    status: parsedStatus,
                    statusChangedAt: new Date(),
                    leftAt: newStatusInactive ? new Date() : null,
                },
            });

            if (!academicYearId || expectedCountDelta === 0) return;

            const schoolClass = await tx.schoolClass.findUnique({
                where: {
                    schoolId_name: {
                        schoolId: student.schoolId,
                        name: student.class,
                    },
                },
                select: {
                    id: true,
                    expectedStudentCount: true,
                    terms: {
                        where: { academicYearId },
                        select: { expectedStudentCount: true },
                        take: 1,
                    },
                },
            });

            if (!schoolClass) return;

            const baseCount =
                schoolClass.terms[0]?.expectedStudentCount ??
                schoolClass.expectedStudentCount;
            const nextCount = Math.max(1, baseCount + expectedCountDelta);

            await tx.schoolClass.update({
                where: { id: schoolClass.id },
                data: { expectedStudentCount: nextCount },
            });
            await tx.schoolClassTerm.upsert({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId: schoolClass.id,
                        academicYearId,
                    },
                },
                create: {
                    schoolClassId: schoolClass.id,
                    academicYearId,
                    expectedStudentCount: nextCount,
                },
                update: { expectedStudentCount: nextCount },
            });
        });

        revalidatePath("/dashboard");
        revalidatePath("/students");
        revalidatePath(`/students/${student.id}`);
        revalidatePath("/analytics");
        revalidatePath("/school/classes");
        revalidateAnalyticsCache(student.schoolId);

        return { success: true, message: "อัปเดตสถานะนักเรียนสำเร็จ" };
    } catch (error) {
        logError("Update student status error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการอัปเดตสถานะนักเรียน",
        };
    }
}
