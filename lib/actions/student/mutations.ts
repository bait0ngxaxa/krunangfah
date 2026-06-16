"use server";

import { prisma } from "@/lib/prisma";
import { ActivityStatus, Prisma, StudentStatus } from "@prisma/client";
import { requireAuth } from "@/lib/session";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { calculateRiskLevel } from "@/lib/utils/phq-scoring";
import type { RiskLevel } from "@/lib/constants/risk-levels";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import { ACTIVITY_INDICES } from "@/lib/actions/activity/constants";
import { revalidatePath } from "next/cache";
import type { ImportResult, ImportStudentSummary } from "./types";
import { logError } from "@/lib/utils/logging";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/actions/school-setup.actions";
import {
    studentProfileUpdateSchema,
    type StudentProfileUpdateInput,
} from "@/lib/validations/student-profile.validation";
import {
    clearIdempotentOperation,
    completeIdempotentOperation,
    startIdempotentOperation,
} from "@/lib/redis-idempotency";
import {
    createImportIdempotencyKey,
    isImportResult,
} from "./import-idempotency";
import { revalidateStudentsCache } from "./cache";

const ACTIVITY_INIT_RISK_LEVELS = new Set<RiskLevel>(["orange", "yellow", "green"]);
const COUNT_EXCLUDED_STUDENT_STATUSES = new Set<StudentStatus>([
    StudentStatus.RESIGNED,
    StudentStatus.TRANSFERRED,
]);
const IMPORT_STUDENTS_IDEMPOTENCY_TTL_SECONDS = 30 * 60;

interface UpdateStudentStatusResult {
    success: boolean;
    message: string;
}

interface UpdateStudentProfileResult {
    success: boolean;
    message: string;
}

interface EditableStudentProfileRecord {
    id: string;
    studentId: string;
    nationalId: string | null;
    class: string;
    schoolId: string;
    status: StudentStatus;
}

interface AdjustSchoolClassCountParams {
    academicYearId: string | null;
    schoolId: string;
    className: string;
    delta: number;
}

function createImportStudentSummary(
    student: ParsedStudent,
    reason?: string,
): ImportStudentSummary {
    return {
        studentId: student.studentId,
        fullName: `${student.firstName} ${student.lastName}`,
        class: student.class,
        reason,
    };
}

function formatImportStudentError(student: ParsedStudent, reason: string): string {
    return `${student.firstName} ${student.lastName} (${student.studentId}): ${reason}`;
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
    let importIdempotencyKey: string | null = null;
    let shouldClearImportIdempotency = false;

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

        importIdempotencyKey = createImportIdempotencyKey({
            userId,
            schoolId,
            academicYearId: resolvedAcademicYearId,
            assessmentRound,
            students,
        });
        const idempotencyResult = await startIdempotentOperation(
            importIdempotencyKey,
            IMPORT_STUDENTS_IDEMPOTENCY_TTL_SECONDS,
        );

        if (idempotencyResult.status === "completed") {
            if (isImportResult(idempotencyResult.result)) {
                return idempotencyResult.result;
            }
            await clearIdempotentOperation(importIdempotencyKey);
        }

        if (idempotencyResult.status === "processing") {
            return {
                success: false,
                status: "error",
                message: "ไฟล์นี้กำลังนำเข้าอยู่ กรุณารอสักครู่แล้วลองใหม่",
            };
        }

        shouldClearImportIdempotency = idempotencyResult.status === "started";
        const completeImport = async (
            result: ImportResult,
        ): Promise<ImportResult> => {
            if (!importIdempotencyKey || !shouldClearImportIdempotency) {
                return result;
            }

            await completeIdempotentOperation(
                importIdempotencyKey,
                IMPORT_STUDENTS_IDEMPOTENCY_TTL_SECONDS,
                result,
            );
            shouldClearImportIdempotency = false;
            return result;
        };

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
            return completeImport({
                success: false,
                status: "error",
                message: "ไม่พบข้อมูลห้องที่คุณดูแล กรุณาตั้งค่าโปรไฟล์ก่อน",
            });
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
                return completeImport({
                    success: false,
                    status: "error",
                    message:
                        "ปีการศึกษานี้ยังไม่มีข้อมูลการประเมินครั้งที่ 1 จึงยังนำเข้าครั้งที่ 2 ไม่ได้",
                });
            }
        }

        const errors: string[] = [];
        const failedStudents: ImportStudentSummary[] = [];
        let skippedCount = 0;
        const seenStudentIds = new Set<string>();
        const seenNationalIds = new Set<string>();
        const eligibleRows: ParsedStudent[] = [];

        for (const studentData of students) {
            const studentClass = normalizeClassName(studentData.class);
            if (!validClassSet.has(studentClass)) {
                failedStudents.push(
                    createImportStudentSummary(
                        studentData,
                        "ยังไม่มีห้องเรียนดังกล่าวในระบบ",
                    ),
                );
                skippedCount++;
                continue;
            }

            if (isClassTeacher && advisoryClass) {
                if (studentClass !== advisoryClass) {
                    failedStudents.push(
                        createImportStudentSummary(
                            studentData,
                            "ไม่ใช่ห้องที่คุณดูแล",
                        ),
                    );
                    skippedCount++;
                    continue;
                }
            }

            if (seenStudentIds.has(studentData.studentId)) {
                const reason = "พบรหัสนักเรียนซ้ำในไฟล์นำเข้า";
                errors.push(formatImportStudentError(studentData, reason));
                failedStudents.push(createImportStudentSummary(studentData, reason));
                continue;
            }
            if (seenNationalIds.has(studentData.nationalId)) {
                const reason = "พบเลขบัตรประชาชนซ้ำในไฟล์นำเข้า";
                errors.push(formatImportStudentError(studentData, reason));
                failedStudents.push(createImportStudentSummary(studentData, reason));
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
                    duplicateRoundFailures: [] as ImportStudentSummary[],
                    importedStudents: [] as ImportStudentSummary[],
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
                    const reason = "เลขบัตรประชาชนซ้ำกับข้อมูลที่มีในระบบ";
                    errors.push(formatImportStudentError(row, reason));
                    failedStudents.push(createImportStudentSummary(row, reason));
                    return false;
                }

                if (
                    nationalIdOwner &&
                    studentIdOwner &&
                    nationalIdOwner.id !== studentIdOwner.id
                ) {
                    const reason = "เลขบัตรประชาชนซ้ำกับนักเรียนคนอื่นในระบบ";
                    errors.push(formatImportStudentError(row, reason));
                    failedStudents.push(createImportStudentSummary(row, reason));
                    return false;
                }

                return true;
            });

            if (rowsSafeToImport.length === 0) {
                return {
                    importedCount: 0,
                    duplicateRoundErrors: [] as string[],
                    duplicateRoundFailures: [] as ImportStudentSummary[],
                    importedStudents: [] as ImportStudentSummary[],
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
            const duplicateRoundFailures: ImportStudentSummary[] = [];
            const importedStudents: ImportStudentSummary[] = [];
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
                    const reason =
                        "ยังไม่มีข้อมูลการประเมินครั้งที่ 1 สำหรับปีการศึกษานี้";
                    duplicateRoundErrors.push(formatImportStudentError(row, reason));
                    duplicateRoundFailures.push(
                        createImportStudentSummary(row, reason),
                    );
                    continue;
                }
                if (hasExistingResultSet.has(student.id)) {
                    const reason = `มีข้อมูลการประเมินครั้งที่ ${assessmentRound} อยู่แล้ว`;
                    duplicateRoundErrors.push(formatImportStudentError(row, reason));
                    duplicateRoundFailures.push(
                        createImportStudentSummary(row, reason),
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
                importedStudents.push(createImportStudentSummary(row));
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
                duplicateRoundFailures,
                importedStudents,
            };
        });

        errors.push(...txResult.duplicateRoundErrors);
        failedStudents.push(...txResult.duplicateRoundFailures);

        revalidatePath("/dashboard");
        revalidatePath("/students");
        revalidatePath("/analytics");
        revalidateStudentsCache(schoolId);
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

        return completeImport({
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
            importedStudents: txResult.importedStudents,
            failedStudents:
                failedStudents.length > 0 ? failedStudents : undefined,
        });
    } catch (error) {
        if (importIdempotencyKey && shouldClearImportIdempotency) {
            await clearIdempotentOperation(importIdempotencyKey);
        }

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
        revalidateStudentsCache(student.schoolId, student.id);
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

function getStudentProfileValidationMessage(
    input: unknown,
): StudentProfileUpdateInput | string {
    const parsed = studentProfileUpdateSchema.safeParse(input);

    if (!parsed.success) {
        return parsed.error.issues[0]?.message ?? "ข้อมูลนักเรียนไม่ถูกต้อง";
    }

    return parsed.data;
}

async function getEditableStudentProfile(
    params: {
        studentId: string;
        userId: string;
        userRole: string;
    },
): Promise<EditableStudentProfileRecord | string> {
    const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: {
            schoolId: true,
            teacher: { select: { advisoryClass: true } },
        },
    });

    if (!user?.schoolId) {
        return "ไม่พบโรงเรียนของคุณ";
    }

    const student = await prisma.student.findFirst({
        where: {
            id: params.studentId,
            schoolId: user.schoolId,
            ...(params.userRole === "class_teacher"
                ? { class: user.teacher?.advisoryClass ?? "" }
                : {}),
        },
        select: {
            id: true,
            studentId: true,
            nationalId: true,
            class: true,
            schoolId: true,
            status: true,
        },
    });

    return student ?? "ไม่พบนักเรียนที่ต้องการแก้ไข";
}

async function adjustSchoolClassExpectedCount(
    tx: Prisma.TransactionClient,
    params: AdjustSchoolClassCountParams,
): Promise<void> {
    if (!params.academicYearId || params.delta === 0) return;

    const schoolClass = await tx.schoolClass.findUnique({
        where: {
            schoolId_name: {
                schoolId: params.schoolId,
                name: params.className,
            },
        },
        select: {
            id: true,
            expectedStudentCount: true,
            terms: {
                where: { academicYearId: params.academicYearId },
                select: { expectedStudentCount: true },
                take: 1,
            },
        },
    });

    if (!schoolClass) return;

    const baseCount =
        schoolClass.terms[0]?.expectedStudentCount ??
        schoolClass.expectedStudentCount;
    const nextCount = Math.max(1, baseCount + params.delta);

    await tx.schoolClass.update({
        where: { id: schoolClass.id },
        data: { expectedStudentCount: nextCount },
    });
    await tx.schoolClassTerm.upsert({
        where: {
            schoolClassId_academicYearId: {
                schoolClassId: schoolClass.id,
                academicYearId: params.academicYearId,
            },
        },
        create: {
            schoolClassId: schoolClass.id,
            academicYearId: params.academicYearId,
            expectedStudentCount: nextCount,
        },
        update: { expectedStudentCount: nextCount },
    });
}

async function validateStudentProfileUpdateRules(
    student: EditableStudentProfileRecord,
    input: StudentProfileUpdateInput,
    userRole: string,
): Promise<string | null> {
    if (userRole === "class_teacher" && input.class !== student.class) {
        return "ครูประจำชั้นไม่สามารถย้ายห้องนักเรียนได้";
    }

    if (input.class !== student.class) {
        const schoolClass = await prisma.schoolClass.findUnique({
            where: {
                schoolId_name: {
                    schoolId: student.schoolId,
                    name: input.class,
                },
            },
            select: { id: true },
        });

        if (!schoolClass) {
            return "ไม่พบห้องเรียนที่ต้องการย้ายไป";
        }
    }

    if (input.nationalId !== student.nationalId && input.nationalId) {
        const duplicateNationalIdStudent = await prisma.student.findUnique({
            where: { nationalId: input.nationalId },
            select: { id: true },
        });

        if (
            duplicateNationalIdStudent &&
            duplicateNationalIdStudent.id !== student.id
        ) {
            return "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว";
        }
    }

    if (input.studentId === student.studentId) return null;

    const duplicateStudent = await prisma.student.findUnique({
        where: {
            studentId_schoolId: {
                studentId: input.studentId,
                schoolId: student.schoolId,
            },
        },
        select: { id: true },
    });

    return duplicateStudent && duplicateStudent.id !== student.id
        ? "รหัสนักเรียนนี้มีอยู่ในโรงเรียนแล้ว"
        : null;
}

async function saveStudentProfileUpdate(
    student: EditableStudentProfileRecord,
    input: StudentProfileUpdateInput,
): Promise<void> {
    const statusChanged = student.status !== input.status;
    const academicYearId = statusChanged ? await getCurrentAcademicYearId() : null;
    const oldStatusInactive = isInactiveStudentStatus(student.status);
    const newStatusInactive = isInactiveStudentStatus(input.status);
    const expectedCountDelta =
        !statusChanged || oldStatusInactive === newStatusInactive
            ? 0
            : newStatusInactive
              ? -1
              : 1;

    await prisma.$transaction(async (tx) => {
        await tx.student.update({
            where: { id: student.id },
            data: {
                studentId: input.studentId,
                nationalId: input.nationalId,
                firstName: input.firstName,
                lastName: input.lastName,
                gender: input.gender,
                age: input.age,
                class: input.class,
                status: input.status,
                ...(statusChanged
                    ? {
                          statusChangedAt: new Date(),
                          leftAt: newStatusInactive ? new Date() : null,
                      }
                    : {}),
            },
        });

        await adjustSchoolClassExpectedCount(tx, {
            academicYearId,
            schoolId: student.schoolId,
            className: student.class,
            delta: expectedCountDelta,
        });
    });
}

function revalidateStudentProfilePaths(
    student: EditableStudentProfileRecord,
    input: StudentProfileUpdateInput,
): void {
    revalidatePath("/dashboard");
    revalidatePath("/students");
    revalidatePath(`/students/${student.id}`);
    revalidateStudentsCache(student.schoolId, student.id);
    if (input.class !== student.class || input.status !== student.status) {
        revalidatePath("/analytics");
        revalidatePath("/school/classes");
        revalidateAnalyticsCache(student.schoolId);
    }
}

export async function updateStudentProfile(
    studentId: string,
    input: unknown,
): Promise<UpdateStudentProfileResult> {
    try {
        const session = await requireAuth();
        const userRole = session.user.role;

        if (userRole === "system_admin") {
            return {
                success: false,
                message: "System admin ดูข้อมูลนักเรียนได้อย่างเดียว",
            };
        }

        if (userRole !== "school_admin" && userRole !== "class_teacher") {
            return {
                success: false,
                message: "คุณไม่มีสิทธิ์แก้ไขข้อมูลนักเรียน",
            };
        }

        const validated = getStudentProfileValidationMessage(input);
        if (typeof validated === "string") {
            return { success: false, message: validated };
        }

        const student = await getEditableStudentProfile({
            studentId,
            userId: session.user.id,
            userRole,
        });
        if (typeof student === "string") {
            return { success: false, message: student };
        }

        const ruleError = await validateStudentProfileUpdateRules(
            student,
            validated,
            userRole,
        );
        if (ruleError) {
            return { success: false, message: ruleError };
        }

        await saveStudentProfileUpdate(student, validated);
        revalidateStudentProfilePaths(student, validated);

        return { success: true, message: "อัปเดตข้อมูลนักเรียนสำเร็จ" };
    } catch (error) {
        logError("Update student profile error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลนักเรียน",
        };
    }
}
