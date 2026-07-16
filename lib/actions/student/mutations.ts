"use server";

import { prisma } from "@/lib/database/prisma";
import { ActivityStatus, Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth/session";
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
    parseStudentStatusValue,
    type StudentStatusValue,
} from "@/lib/constants/student-status";
import {
    clearIdempotentOperation,
    completeIdempotentOperation,
    startIdempotentOperation,
} from "@/lib/cache/redis-idempotency";
import {
    createImportIdempotencyKey,
    isImportResult,
} from "./import-idempotency";
import { revalidateStudentsCache } from "./cache";
import {
    applyStudentClassCountAdjustments,
    calculateStudentContributionAdjustments,
    calculateStudentStatusState,
    getCurrentAcademicYearId,
} from "./student-class-count";

const ACTIVITY_INIT_RISK_LEVELS = new Set<RiskLevel>(["orange", "yellow", "green"]);
const IMPORT_STUDENTS_IDEMPOTENCY_TTL_SECONDS = 30 * 60;

interface UpdateStudentStatusResult {
    success: boolean;
    message: string;
}

interface UpdatedStudentProfile {
    id: string;
    studentId: string;
    nationalId: string | null;
    firstName: string;
    lastName: string;
    gender: string | null;
    age: number | null;
    class: string;
    status: StudentStatusValue;
}

type UpdateStudentProfileResult =
    | {
          success: true;
          message: string;
          student: UpdatedStudentProfile;
      }
    | {
          success: false;
          message: string;
          student?: never;
      };

interface StudentProfileUpdateContext {
    activePhqResultId: string;
}

interface EditableStudentProfileRecord {
    id: string;
    studentId: string;
    nationalId: string | null;
    class: string;
    schoolId: string;
    status: StudentStatusValue;
    statusChangedAt: Date | null;
    leftAt: Date | null;
    disabledAt: Date | null;
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

interface ImportIdentityRecord {
    id: string;
    schoolId: string;
}

function resolveImportIdentity(
    studentIdOwner: ImportIdentityRecord | undefined,
    nationalIdOwner: ImportIdentityRecord | undefined,
): { kind: "new" } | { kind: "existing"; studentId: string } | { kind: "conflict" } {
    if (!studentIdOwner && !nationalIdOwner) return { kind: "new" };
    if (
        studentIdOwner &&
        nationalIdOwner &&
        studentIdOwner.id === nationalIdOwner.id
    ) {
        return { kind: "existing", studentId: studentIdOwner.id };
    }
    return { kind: "conflict" };
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
            if (
                isImportResult(idempotencyResult.result) &&
                idempotencyResult.result.success
            ) {
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
        const finishImport = async (
            result: ImportResult,
        ): Promise<ImportResult> => {
            if (!importIdempotencyKey || !shouldClearImportIdempotency) {
                return result;
            }

            if (result.success) {
                await completeIdempotentOperation(
                    importIdempotencyKey,
                    IMPORT_STUDENTS_IDEMPOTENCY_TTL_SECONDS,
                    result,
                );
            } else {
                await clearIdempotentOperation(importIdempotencyKey);
            }
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
            return finishImport({
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
                return finishImport({
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
        let identityConflictCount = 0;
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
                    createdStudentCount: 0,
                    updatedStudentCount: 0,
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
                    identityConflictCount++;
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
                    identityConflictCount++;
                    const reason = "เลขบัตรประชาชนซ้ำกับนักเรียนคนอื่นในระบบ";
                    errors.push(formatImportStudentError(row, reason));
                    failedStudents.push(createImportStudentSummary(row, reason));
                    return false;
                }

                if (
                    resolveImportIdentity(studentIdOwner, nationalIdOwner).kind ===
                    "conflict"
                ) {
                    identityConflictCount++;
                    const reason =
                        "รหัสนักเรียนและเลขบัตรประชาชนไม่ตรงกับนักเรียนคนเดียวกัน กรุณาตรวจสอบข้อมูลก่อนนำเข้า";
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
                    createdStudentCount: 0,
                    updatedStudentCount: 0,
                };
            }

            const resolveExistingStudentId = (row: ParsedStudent): string | null => {
                const identity = resolveImportIdentity(
                    existingStudentByStudentId.get(row.studentId),
                    studentByNationalId.get(row.nationalId),
                );
                return identity.kind === "existing" ? identity.studentId : null;
            };
            const existingCandidateIds = [
                ...new Set(
                    rowsSafeToImport
                        .map(resolveExistingStudentId)
                        .filter((id): id is string => id !== null),
                ),
            ];
            const existingPhqResults = await tx.phqResult.findMany({
                where: {
                    studentId: { in: existingCandidateIds },
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
                                      studentId: { in: existingCandidateIds },
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
            const rowsToMutate = rowsSafeToImport.filter((row) => {
                const existingStudentId = resolveExistingStudentId(row);
                if (
                    assessmentRound === 2 &&
                    (!existingStudentId || !round1StudentSet?.has(existingStudentId))
                ) {
                    const reason =
                        "ยังไม่มีข้อมูลการประเมินครั้งที่ 1 สำหรับปีการศึกษานี้";
                    duplicateRoundErrors.push(formatImportStudentError(row, reason));
                    duplicateRoundFailures.push(
                        createImportStudentSummary(row, reason),
                    );
                    return false;
                }
                if (
                    existingStudentId &&
                    hasExistingResultSet.has(existingStudentId)
                ) {
                    const reason = `มีข้อมูลการประเมินครั้งที่ ${assessmentRound} อยู่แล้ว`;
                    duplicateRoundErrors.push(formatImportStudentError(row, reason));
                    duplicateRoundFailures.push(
                        createImportStudentSummary(row, reason),
                    );
                    return false;
                }
                return true;
            });

            if (rowsToMutate.length === 0) {
                return {
                    importedCount: 0,
                    duplicateRoundErrors,
                    duplicateRoundFailures,
                    importedStudents: [] as ImportStudentSummary[],
                    createdStudentCount: 0,
                    updatedStudentCount: 0,
                };
            }

            const createdStudentCount = rowsToMutate.filter(
                (row) => resolveExistingStudentId(row) === null,
            ).length;

            await tx.student.createMany({
                data: rowsToMutate.map((row) => ({
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
                                in: rowsToMutate.map((row) => row.studentId),
                            },
                        },
                        {
                            nationalId: {
                                in: rowsToMutate.map((row) => row.nationalId),
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
            for (const row of rowsToMutate) {
                const student =
                    studentByStudentId.get(row.studentId) ??
                    scopedStudentByNationalId.get(row.nationalId);
                if (!student) {
                    continue;
                }

                const updates: {
                    age?: number;
                    class?: string;
                    firstName?: string;
                    gender?: ParsedStudent["gender"];
                    lastName?: string;
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
                if (student.firstName !== row.firstName) {
                    updates.firstName = row.firstName;
                }
                if (student.lastName !== row.lastName) {
                    updates.lastName = row.lastName;
                }
                if (student.class !== row.class) {
                    updates.class = row.class;
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

            const importedStudents: ImportStudentSummary[] = [];
            const phqResultsToCreate: Prisma.PhqResultCreateManyInput[] = [];

            for (const row of rowsToMutate) {
                const student =
                    studentByStudentId.get(row.studentId) ??
                    scopedStudentByNationalId.get(row.nationalId);
                if (!student) {
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
                createdStudentCount,
                updatedStudentCount: studentUpdates.length,
            };
        });

        errors.push(...txResult.duplicateRoundErrors);
        failedStudents.push(...txResult.duplicateRoundFailures);

        revalidatePath("/dashboard");
        revalidatePath("/students");
        revalidatePath("/analytics");
        revalidateStudentsCache(schoolId);
        await revalidateAnalyticsCache(schoolId);

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

        return finishImport({
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
            createdStudents: txResult.createdStudentCount,
            updatedStudents: txResult.updatedStudentCount,
            phqCreated: importedCount,
            duplicateRoundsSkipped: txResult.duplicateRoundFailures.length,
            identityConflicts: identityConflictCount,
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

        const parsedStatus = parseStudentStatusValue(status);
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
        const schoolId = user.schoolId;

        const result = await prisma.$transaction(async (tx) => {
            const student = await tx.student.findFirst({
                where: {
                    id: studentId,
                    schoolId,
                    ...(userRole === "class_teacher"
                        ? { class: user.teacher?.advisoryClass ?? "" }
                        : {}),
                },
                select: {
                    id: true,
                    class: true,
                    status: true,
                    statusChangedAt: true,
                    leftAt: true,
                    disabledAt: true,
                    schoolId: true,
                    updatedAt: true,
                },
            });
            if (!student) return { kind: "not-found" as const };
            if (student.status === parsedStatus) {
                return { kind: "no-change" as const };
            }
            const academicYearId = await getCurrentAcademicYearId(tx);
            const statusState = calculateStudentStatusState({
                oldStatus: student.status,
                newStatus: parsedStatus,
                statusChangedAt: student.statusChangedAt,
                leftAt: student.leftAt,
            });
            const updateResult = await tx.student.updateMany({
                where: {
                    id: student.id,
                    updatedAt: student.updatedAt,
                },
                data: {
                    status: parsedStatus,
                    statusChangedAt: statusState.statusChangedAt,
                    leftAt: statusState.leftAt,
                },
            });
            if (updateResult.count !== 1) {
                return { kind: "conflict" as const };
            }

            await applyStudentClassCountAdjustments(tx, {
                academicYearId,
                schoolId: student.schoolId,
                adjustments: calculateStudentContributionAdjustments({
                    before: {
                        className: student.class,
                        status: student.status,
                        disabledAt: student.disabledAt,
                    },
                    after: {
                        className: student.class,
                        status: parsedStatus,
                        disabledAt: student.disabledAt,
                    },
                }),
            });
            return { kind: "updated" as const, schoolId: student.schoolId };
        });

        if (result.kind === "not-found") {
            return { success: false, message: "ไม่พบนักเรียนที่ต้องการแก้ไข" };
        }
        if (result.kind === "no-change") {
            return { success: true, message: "สถานะนักเรียนเป็นค่านี้อยู่แล้ว" };
        }
        if (result.kind === "conflict") {
            return {
                success: false,
                message: "ข้อมูลนักเรียนมีการเปลี่ยนแปลง กรุณาลองใหม่อีกครั้ง",
            };
        }

        revalidatePath("/dashboard");
        revalidatePath("/students");
        revalidatePath(`/students/${studentId}`);
        revalidatePath("/analytics");
        revalidatePath("/school/classes");
        revalidateStudentsCache(result.schoolId, studentId);
        await revalidateAnalyticsCache(result.schoolId);

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

function getStudentProfileUpdateContext(
    input: unknown,
): StudentProfileUpdateContext | string {
    if (!input || typeof input !== "object") {
        return "กรุณาโหลดหน้าข้อมูลล่าสุดก่อนแก้ไขข้อมูลนักเรียน";
    }

    const activePhqResultId = (input as { activePhqResultId?: unknown })
        .activePhqResultId;
    if (typeof activePhqResultId !== "string" || !activePhqResultId.trim()) {
        return "กรุณาโหลดหน้าข้อมูลล่าสุดก่อนแก้ไขข้อมูลนักเรียน";
    }

    return { activePhqResultId };
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
            statusChangedAt: true,
            leftAt: true,
            disabledAt: true,
        },
    });

    return student ?? "ไม่พบนักเรียนที่ต้องการแก้ไข";
}

async function validateLatestImportedProfileContext(
    studentId: string,
    context: StudentProfileUpdateContext,
): Promise<string | null> {
    const latestPhqResult = await prisma.phqResult.findFirst({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
    });

    if (!latestPhqResult) {
        return "แก้ไขข้อมูลได้เฉพาะนักเรียนที่มีข้อมูลนำเข้าล่าสุดเท่านั้น";
    }

    return latestPhqResult.id === context.activePhqResultId
        ? null
        : "กำลังดูข้อมูลย้อนหลัง กรุณากลับไปที่ปีการศึกษาล่าสุดก่อนแก้ไขข้อมูลนักเรียน";
}

async function validateStudentProfileUpdateRules(
    student: EditableStudentProfileRecord,
    input: StudentProfileUpdateInput,
): Promise<string | null> {
    if (input.class !== student.class) {
        return "ห้องเรียนแก้ไขได้จากการนำเข้าข้อมูลเท่านั้น";
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
): Promise<UpdatedStudentProfile> {
    return prisma.$transaction(async (tx) => {
        const currentStudent = await tx.student.findUnique({
            where: { id: student.id },
            select: {
                id: true,
                class: true,
                schoolId: true,
                status: true,
                statusChangedAt: true,
                leftAt: true,
                disabledAt: true,
                updatedAt: true,
            },
        });
        if (!currentStudent) throw new Error("ไม่พบนักเรียนที่ต้องการแก้ไข");

        const statusChanged = currentStudent.status !== input.status;
        const academicYearId = statusChanged
            ? await getCurrentAcademicYearId(tx)
            : null;
        const statusState = calculateStudentStatusState({
            oldStatus: currentStudent.status,
            newStatus: input.status,
            statusChangedAt: currentStudent.statusChangedAt,
            leftAt: currentStudent.leftAt,
        });
        const updateResult = await tx.student.updateMany({
            where: {
                id: student.id,
                updatedAt: currentStudent.updatedAt,
            },
            data: {
                studentId: input.studentId,
                nationalId: input.nationalId,
                firstName: input.firstName,
                lastName: input.lastName,
                gender: input.gender,
                age: input.age,
                class: currentStudent.class,
                status: input.status,
                ...(statusChanged
                    ? {
                          statusChangedAt: statusState.statusChangedAt,
                          leftAt: statusState.leftAt,
                      }
                    : {}),
            },
        });
        if (updateResult.count !== 1) {
            throw new Error("ข้อมูลนักเรียนมีการเปลี่ยนแปลง");
        }

        const updatedStudent = await tx.student.findUnique({
            where: { id: student.id },
            select: {
                id: true,
                studentId: true,
                nationalId: true,
                firstName: true,
                lastName: true,
                gender: true,
                age: true,
                class: true,
                status: true,
            },
        });
        if (!updatedStudent) throw new Error("ไม่พบนักเรียนที่ต้องการแก้ไข");

        await applyStudentClassCountAdjustments(tx, {
            schoolId: student.schoolId,
            academicYearId,
            adjustments: calculateStudentContributionAdjustments({
                before: {
                    className: currentStudent.class,
                    status: currentStudent.status,
                    disabledAt: currentStudent.disabledAt,
                },
                after: {
                    className: currentStudent.class,
                    status: input.status,
                    disabledAt: currentStudent.disabledAt,
                },
            }),
        });

        return updatedStudent;
    });
}

async function revalidateStudentProfilePaths(
    student: EditableStudentProfileRecord,
    input: StudentProfileUpdateInput,
): Promise<void> {
    revalidatePath("/dashboard");
    revalidatePath("/students");
    revalidatePath(`/students/${student.id}`);
    revalidateStudentsCache(student.schoolId, student.id);
    if (input.class !== student.class || input.status !== student.status) {
        revalidatePath("/analytics");
        revalidatePath("/school/classes");
        await revalidateAnalyticsCache(student.schoolId);
    }
}

export async function updateStudentProfile(
    studentId: string,
    input: unknown,
    context?: unknown,
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

        const updateContext = getStudentProfileUpdateContext(context);
        if (typeof updateContext === "string") {
            return { success: false, message: updateContext };
        }

        const student = await getEditableStudentProfile({
            studentId,
            userId: session.user.id,
            userRole,
        });
        if (typeof student === "string") {
            return { success: false, message: student };
        }

        const contextError = await validateLatestImportedProfileContext(
            student.id,
            updateContext,
        );
        if (contextError) {
            return { success: false, message: contextError };
        }

        const ruleError = await validateStudentProfileUpdateRules(
            student,
            validated,
        );
        if (ruleError) {
            return { success: false, message: ruleError };
        }

        const updatedStudent = await saveStudentProfileUpdate(student, validated);
        await revalidateStudentProfilePaths(student, validated);

        return {
            success: true,
            message: "อัปเดตข้อมูลนักเรียนสำเร็จ",
            student: updatedStudent,
        };
    } catch (error) {
        logError("Update student profile error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลนักเรียน",
        };
    }
}
