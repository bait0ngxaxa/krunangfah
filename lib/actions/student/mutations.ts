"use server";

import { prisma } from "@/lib/database/prisma";
import { ActivityStatus, Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth/session";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { isImportStudentAge, isImportStudentGender } from "@/lib/utils/student-import-demographics";
import { calculateRiskLevel, isPhqScores } from "@/lib/utils/phq-scoring";
import type { RiskLevel } from "@/lib/constants/risk-levels";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import {
    ACTIVITY_INDICES,
    canGenerateActivitiesForAssessmentRound,
} from "@/lib/actions/activity/constants";
import { revalidatePath } from "next/cache";
import type { ImportResult, ImportStudentSummary, ImportStudentsOptions } from "./types";
import { logError } from "@/lib/utils/logging";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/services/school-class-term-service";
import {
    studentIdentifierUpdateSchema,
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
import {
    isValidNationalId,
    maskNationalId,
    NATIONAL_ID_ERROR_MESSAGE,
    normalizeImportNationalId,
    redactNationalIds,
} from "@/lib/utils/national-id";
import { MAX_IMPORT_ROW_COUNT } from "@/lib/constants/import";
import { LATEST_PHQ_ORDER_BY } from "@/lib/utils/phq-result-selection";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";
import {
    findInBatchZeroKeyConflicts,
    formatInBatchConflictReason,
    formatUndisclosedReviewReason,
    getImportAgeChange,
    IMPORT_STUDENT_SELECT,
    indexTextIdsByZeroKey,
    loadZeroKeyCandidates,
    normalizeImportName,
    NUMERIC_ID_ACK_REQUIRED_MESSAGE,
    parseImportStudentsOptions,
    resolveNumericStudentIdentity,
    zeroKey,
    type ImportStudentRecord,
    type ResolvedImportRow,
    type StoredImportStudent,
} from "./import-identity";

const ACTIVITY_INIT_RISK_LEVELS = new Set<RiskLevel>(["orange", "yellow", "green"]);
const IMPORT_STUDENTS_IDEMPOTENCY_TTL_SECONDS = 30 * 60;
const MAX_IMPORT_UNIQUE_CONFLICT_RETRIES = 3;
const HISTORICAL_PROFILE_CONTEXT_MESSAGE =
    "กำลังดูข้อมูลย้อนหลัง กรุณากลับไปที่ปีการศึกษาล่าสุดก่อนแก้ไขข้อมูลนักเรียน";

async function runImportTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
    for (let attempt = 0; attempt < MAX_IMPORT_UNIQUE_CONFLICT_RETRIES; attempt++) {
        try {
            return await runSerializableTransaction(callback);
        } catch (error) {
            const isConcurrentUniqueConflict =
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002";
            if (
                !isConcurrentUniqueConflict ||
                attempt === MAX_IMPORT_UNIQUE_CONFLICT_RETRIES - 1
            ) {
                throw error;
            }
        }
    }

    throw new Error("Import transaction retry limit exceeded");
}

interface UpdateStudentStatusResult {
    success: boolean;
    message: string;
}

interface UpdatedStudentProfile {
    id: string;
    studentId: string;
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
    sourceStudentId?: string,
): ImportStudentSummary {
    return {
        studentId: redactNationalIds(student.studentId),
        fullName: redactNationalIds(`${student.firstName} ${student.lastName}`),
        class: redactNationalIds(student.class),
        reason,
        ...(sourceStudentId === undefined ? {} : { sourceStudentId: redactNationalIds(sourceStudentId) }),
    };
}

function summarizeResolvedRow(entry: ResolvedImportRow, reason?: string): ImportStudentSummary {
    const { row, source } = entry;
    return createImportStudentSummary(
        row,
        reason,
        source.studentId === row.studentId ? undefined : source.studentId,
    );
}

function formatImportStudentError(student: ParsedStudent, reason: string): string {
    return redactNationalIds(`${student.firstName} ${student.lastName} (${student.studentId}): ${reason}`);
}

function normalizeImportStudents(students: ParsedStudent[]): {
    students: ParsedStudent[];
    errors: string[];
} {
    const normalizedStudents: ParsedStudent[] = [];
    const errors: string[] = [];

    for (const student of students) {
        const { nationalId } = student;
        if (nationalId !== null && nationalId !== undefined && typeof nationalId !== "string") {
            errors.push(formatImportStudentError(student, NATIONAL_ID_ERROR_MESSAGE));
            continue;
        }
        const normalizedNationalId = normalizeImportNationalId(nationalId);
        if (normalizedNationalId !== null && !isValidNationalId(normalizedNationalId)) {
            errors.push(formatImportStudentError(student, NATIONAL_ID_ERROR_MESSAGE));
            continue;
        }
        normalizedStudents.push({
            ...student,
            studentId: student.studentId.trim(),
            nationalId: normalizedNationalId,
            class: normalizeClassName(student.class),
        });
    }

    return { students: normalizedStudents, errors };
}

function getActivityNumbersByRiskLevel(riskLevel: RiskLevel): number[] {
    if (!Object.hasOwn(ACTIVITY_INDICES, riskLevel)) {
        return [];
    }
    return ACTIVITY_INDICES[riskLevel as keyof typeof ACTIVITY_INDICES];
}

const DAYS_PER_YEAR = 365.2425;

function isMinorNameCorrection(before: string, after: string): boolean {
    const left = Array.from(before);
    const right = Array.from(after);
    const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
    if (longer.length - shorter.length > 1) return false;

    const mismatch = shorter.findIndex((character, index) => character !== longer.at(index));
    if (mismatch === -1) return true;
    const offset = longer.length - shorter.length;
    return shorter.slice(mismatch + (offset === 0 ? 1 : 0)).join("") ===
        longer.slice(mismatch + 1).join("");
}

function resolveImportIdentity(
    row: ParsedStudent,
    existingStudent: ImportStudentRecord | undefined,
    nationalIdOwner: { id: string } | undefined,
    termStart: Date | undefined,
): { kind: "new" | "exact" | "consistent" } | { kind: "conflict" | "review"; reason: string } {
    if (nationalIdOwner && nationalIdOwner.id !== existingStudent?.id) {
        return {
            kind: "conflict",
            reason: "เลขประจำตัวซ้ำกับข้อมูลที่มีในระบบ กรุณาตรวจสอบรหัสนักเรียนและเลขประจำตัวก่อนนำเข้า",
        };
    }

    if (!existingStudent) return { kind: "new" };

    if (row.nationalId !== null && existingStudent.nationalId !== null) {
        return row.nationalId === existingStudent.nationalId
            ? { kind: "exact" }
            : {
                  kind: "conflict",
                  reason: "เลขประจำตัวไม่ตรงกับข้อมูลของรหัสนักเรียนนี้ กรุณาตรวจสอบข้อมูลก่อนนำเข้า",
              };
    }

    const genderCorroborates = existingStudent.gender === row.gender;
    if (existingStudent.gender !== null && !genderCorroborates) {
        return { kind: "review", reason: "เพศกำเนิดต่างจากข้อมูลเดิม กรุณาตรวจสอบตัวตนและแก้ไขข้อมูลนักเรียนก่อนนำเข้า" };
    }

    const ageChange = getImportAgeChange(row, existingStudent);
    if (ageChange !== null && Math.abs(ageChange) > 1) {
        const priorStart = existingStudent.phqResults[0]?.academicYear.startDate;
        const elapsedYears = termStart && priorStart
            ? (termStart.getTime() - priorStart.getTime()) / (DAYS_PER_YEAR * 86_400_000)
            : undefined;
        if (elapsedYears === undefined || Math.abs(ageChange - elapsedYears) > 1) {
            return { kind: "review", reason: "อายุเปลี่ยนต่างจากช่วงเวลาของการประเมิน กรุณาตรวจสอบตัวตนและอายุก่อนนำเข้า" };
        }
    }

    const firstName = normalizeImportName(row.firstName);
    const lastName = normalizeImportName(row.lastName);
    const existingFirstName = normalizeImportName(existingStudent.firstName);
    const existingLastName = normalizeImportName(existingStudent.lastName);
    if (firstName === existingFirstName && lastName === existingLastName) {
        if (!genderCorroborates && ageChange === null) {
            return { kind: "review", reason: "ข้อมูลเดิมไม่พอยืนยันตัวตน กรุณาตรวจสอบทะเบียนและแก้ไขข้อมูลนักเรียนก่อนนำเข้า" };
        }
        return { kind: ageChange === 0 ? "exact" : "consistent" };
    }

    // A typo alone cannot corroborate the school code. Require both known demographics.
    if (
        genderCorroborates && ageChange !== null && (
            (firstName === existingFirstName && isMinorNameCorrection(existingLastName, lastName)) ||
            (lastName === existingLastName && isMinorNameCorrection(existingFirstName, firstName))
        )
    ) {
        return { kind: "consistent" };
    }
    return {
        kind: "review",
        reason: "ชื่อหรือนามสกุลไม่ตรงกับข้อมูลของรหัสนักเรียนนี้ กรุณาตรวจสอบตัวตนและแก้ไขข้อมูลนักเรียนก่อนนำเข้า",
    };
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
    options?: ImportStudentsOptions,
): Promise<ImportResult> {
    let importIdempotencyKey: string | null = null;
    let shouldClearImportIdempotency = false;

    try {
        const session = await requireAuth();
        const userId = session.user.id;
        const userRole = session.user.role;

        if (!Array.isArray(students) || students.length === 0 || students.length > MAX_IMPORT_ROW_COUNT) {
            return {
                success: false,
                status: "error",
                message: "จำนวนข้อมูลนำเข้าไม่ถูกต้อง",
            };
        }

        if (assessmentRound !== 1 && assessmentRound !== 2) {
            return {
                success: false,
                status: "error",
                message: "รอบการประเมินไม่ถูกต้อง",
            };
        }

        const importOptions = parseImportStudentsOptions(options);
        if (!importOptions) {
            return {
                success: false,
                status: "error",
                message: "ข้อมูลการยืนยันนำเข้าไม่ถูกต้อง",
            };
        }
        // UX safeguard against accidental confirmation, not a security control:
        // the client chooses both this flag and the numeric provenance it covers.
        const { numericIdAcknowledged } = importOptions;

        const invalidPhqRowIndex = students.findIndex(
            (student) => !isPhqScores(student?.scores),
        );
        if (invalidPhqRowIndex !== -1) {
            return {
                success: false,
                status: "error",
                message: "ข้อมูลคำตอบ PHQ ไม่ถูกต้อง",
                errors: [
                    `ข้อมูลลำดับที่ ${invalidPhqRowIndex + 1}: คะแนน PHQ ภายในต้องเป็นจำนวนเต็ม 0-3 และข้อ 9a/9b ต้องเป็นค่าบูลีน`,
                ],
            };
        }

        const invalidStudentRowIndex = students.findIndex((student) =>
            [student.studentId, student.firstName, student.lastName, student.class]
                .some((value) => typeof value !== "string" || value.trim() === ""),
        );
        if (invalidStudentRowIndex !== -1) {
            return {
                success: false,
                status: "error",
                message: "กรุณาระบุรหัสนักเรียน ชื่อ นามสกุล และห้องเรียน",
                errors: [`ข้อมูลลำดับที่ ${invalidStudentRowIndex + 1}: ข้อมูลนักเรียนไม่ครบถ้วน`],
            };
        }

        const invalidDemographics = students.findIndex(({ age, gender, numericStudentId }) =>
            !isImportStudentAge(age) || !isImportStudentGender(gender) ||
            (numericStudentId !== undefined && typeof numericStudentId !== "boolean"),
        );
        if (invalidDemographics !== -1) {
            return {
                success: false,
                status: "error",
                message: `ข้อมูลนักเรียนลำดับที่ ${invalidDemographics + 1} ไม่ถูกต้อง กรุณาตรวจเพศกำเนิดและอายุ (จำนวนเต็ม 1–100 ปี)`,
            };
        }

        const normalizedImport = normalizeImportStudents(students);
        if (normalizedImport.errors.length > 0) {
            return {
                success: false,
                status: "error",
                message: "ข้อมูลเลขบัตรประชาชนในไฟล์ไม่ถูกต้อง",
                errors: normalizedImport.errors,
            };
        }
        const normalizedStudents = normalizedImport.students;

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
        const advisoryClass = normalizeClassName(user.teacher?.advisoryClass ?? "");
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
            classScope: isClassTeacher ? advisoryClass : undefined,
            students: normalizedStudents,
            numericIdAcknowledged,
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
        const studentIdCounts = new Map<string, number>();
        const nationalIdCounts = new Map<string, number>();
        const eligibleRows: ParsedStudent[] = [];
        const textIdsByZeroKey = indexTextIdsByZeroKey(normalizedStudents);

        for (const { studentId, nationalId } of normalizedStudents) {
            studentIdCounts.set(studentId, (studentIdCounts.get(studentId) ?? 0) + 1);
            if (nationalId !== null) nationalIdCounts.set(nationalId, (nationalIdCounts.get(nationalId) ?? 0) + 1);
        }

        for (const studentData of normalizedStudents) {
            const studentClass = studentData.class;
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

            if ((studentIdCounts.get(studentData.studentId) ?? 0) > 1) {
                const reason = "พบรหัสนักเรียนซ้ำในไฟล์นำเข้า";
                errors.push(formatImportStudentError(studentData, reason));
                failedStudents.push(createImportStudentSummary(studentData, reason));
                continue;
            }
            if (studentData.nationalId !== null && (nationalIdCounts.get(studentData.nationalId) ?? 0) > 1) {
                const reason = "พบเลขบัตรประชาชนซ้ำในไฟล์นำเข้า";
                errors.push(formatImportStudentError(studentData, reason));
                failedStudents.push(createImportStudentSummary(studentData, reason));
                continue;
            }
            const inBatchConflicts = findInBatchZeroKeyConflicts(studentData, textIdsByZeroKey);
            if (inBatchConflicts.length > 0) {
                const reason = formatInBatchConflictReason(studentData, inBatchConflicts);
                errors.push(formatImportStudentError(studentData, reason));
                failedStudents.push(createImportStudentSummary(studentData, reason));
                continue;
            }

            eligibleRows.push(studentData);
        }

        const importedStudentIds = eligibleRows.map((row) => row.studentId);
        const importedNationalIds = eligibleRows
            .map((row) => row.nationalId)
            .filter((id): id is string => id !== null);

        const txResult = await runImportTransaction(async (tx) => {
            const identityConflictErrors: string[] = [];
            const identityConflictFailures: ImportStudentSummary[] = [];
            const classAccessFailures: ImportStudentSummary[] = [];
            if (importedStudentIds.length === 0) {
                return {
                    importedCount: 0,
                    duplicateRoundErrors: [] as string[],
                    duplicateRoundFailures: [] as ImportStudentSummary[],
                    importedStudents: [] as ImportStudentSummary[],
                    createdStudentCount: 0,
                    updatedStudentCount: 0,
                    identityConflictErrors,
                    identityConflictFailures,
                    classAccessFailures,
                };
            }

            const existingStudentsByNationalId = importedNationalIds.length > 0
                ? await tx.student.findMany({
                      where: { nationalId: { in: importedNationalIds } },
                      select: { id: true, nationalId: true },
                  })
                : [];

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
                select: IMPORT_STUDENT_SELECT,
            });
            const existingStudentByStudentId = new Map<string, StoredImportStudent>(
                existingStudentsByStudentId.map((student) => [
                    student.studentId,
                    student,
                ]),
            );
            const zeroKeyCandidates = await loadZeroKeyCandidates(
                tx,
                schoolId,
                eligibleRows,
                existingStudentByStudentId,
            );

            const resolvedRows: ResolvedImportRow[] = [];
            for (const row of eligibleRows) {
                const nationalIdOwner = row.nationalId === null
                    ? undefined
                    : studentByNationalId.get(row.nationalId);
                if (row.numericStudentId !== true) {
                    resolvedRows.push({
                        row,
                        source: row,
                        existingStudent: existingStudentByStudentId.get(row.studentId),
                        nationalIdOwner,
                    });
                    continue;
                }
                const numeric = resolveNumericStudentIdentity(
                    row,
                    zeroKeyCandidates.get(zeroKey(row.studentId)) ?? [],
                    nationalIdOwner,
                );
                if (numeric.kind === "review") {
                    // Do not list codes from classes a class teacher cannot access.
                    const hidesCandidates = isClassTeacher && numeric.candidates.some(
                        (candidate) => normalizeClassName(candidate.class) !== advisoryClass,
                    );
                    const reason = hidesCandidates ? formatUndisclosedReviewReason(row) : numeric.reason;
                    identityConflictErrors.push(formatImportStudentError(row, reason));
                    identityConflictFailures.push(createImportStudentSummary(row, reason));
                    continue;
                }
                const existingStudent = numeric.kind === "matched" ? numeric.student : undefined;
                resolvedRows.push({
                    // Every write for a resolved row uses the stored code, never the shortened one.
                    row: existingStudent ? { ...row, studentId: existingStudent.studentId } : row,
                    source: row,
                    existingStudent,
                    nationalIdOwner,
                });
            }

            const resolvedIdCounts = new Map<string, number>();
            for (const { row } of resolvedRows) {
                resolvedIdCounts.set(row.studentId, (resolvedIdCounts.get(row.studentId) ?? 0) + 1);
            }

            const needsTermDates = resolvedRows.some(({ row, existingStudent: existing }) => {
                if (!existing || (row.nationalId !== null && existing.nationalId !== null)) return false;
                return Math.abs(getImportAgeChange(row, existing) ?? 0) > 1;
            });
            const term = needsTermDates ? await tx.academicYear.findUnique({
                where: { id: resolvedAcademicYearId },
                select: { startDate: true },
            }) : null;

            const rowsSafeToImport: ResolvedImportRow[] = [];
            for (const entry of resolvedRows) {
                const { row, source, existingStudent, nationalIdOwner } = entry;
                if ((resolvedIdCounts.get(row.studentId) ?? 0) > 1) {
                    const reason = "พบรหัสนักเรียนซ้ำในไฟล์นำเข้า";
                    identityConflictErrors.push(formatImportStudentError(source, reason));
                    identityConflictFailures.push(summarizeResolvedRow(entry, reason));
                    continue;
                }
                if (isClassTeacher && existingStudent &&
                    normalizeClassName(existingStudent.class) !== advisoryClass) {
                    classAccessFailures.push(createImportStudentSummary(source, "ไม่ใช่ห้องที่คุณดูแล"));
                    continue;
                }
                const identity = resolveImportIdentity(row, existingStudent, nationalIdOwner, term?.startDate);
                if (identity.kind === "conflict" || identity.kind === "review") {
                    identityConflictErrors.push(formatImportStudentError(source, identity.reason));
                    identityConflictFailures.push(summarizeResolvedRow(entry, identity.reason));
                    continue;
                }
                rowsSafeToImport.push(entry);
            }

            if (rowsSafeToImport.length === 0) {
                return {
                    importedCount: 0,
                    duplicateRoundErrors: [] as string[],
                    duplicateRoundFailures: [] as ImportStudentSummary[],
                    importedStudents: [] as ImportStudentSummary[],
                    createdStudentCount: 0,
                    updatedStudentCount: 0,
                    identityConflictErrors,
                    identityConflictFailures,
                    classAccessFailures,
                };
            }

            const existingCandidateIds = rowsSafeToImport.flatMap(({ existingStudent }) =>
                existingStudent ? [existingStudent.id] : [],
            );
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
            const rowsToMutate = rowsSafeToImport.filter((entry) => {
                const existingStudentId = entry.existingStudent?.id;
                if (
                    assessmentRound === 2 &&
                    (!existingStudentId || !round1StudentSet?.has(existingStudentId))
                ) {
                    const reason =
                        "ยังไม่มีข้อมูลการประเมินครั้งที่ 1 สำหรับปีการศึกษานี้";
                    duplicateRoundErrors.push(formatImportStudentError(entry.source, reason));
                    duplicateRoundFailures.push(summarizeResolvedRow(entry, reason));
                    return false;
                }
                if (
                    existingStudentId &&
                    hasExistingResultSet.has(existingStudentId)
                ) {
                    const reason = `มีข้อมูลการประเมินครั้งที่ ${assessmentRound} อยู่แล้ว`;
                    duplicateRoundErrors.push(formatImportStudentError(entry.source, reason));
                    duplicateRoundFailures.push(summarizeResolvedRow(entry, reason));
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
                    identityConflictErrors,
                    identityConflictFailures,
                    classAccessFailures,
                };
            }

            // Checked before the first write so an unacknowledged batch is a
            // complete no-op; a partial success would be cached by idempotency.
            const createsNumericStudents = rowsToMutate.some(
                ({ row, existingStudent }) => !existingStudent && row.numericStudentId === true,
            );
            if (createsNumericStudents && !numericIdAcknowledged) {
                return {
                    numericAcknowledgementRequired: true as const,
                    identityConflictErrors,
                    identityConflictFailures,
                    classAccessFailures,
                    duplicateRoundErrors,
                    duplicateRoundFailures,
                };
            }

            const newStudents = rowsToMutate
                .filter(({ existingStudent }) => !existingStudent)
                .map(({ row }) => ({
                    studentId: row.studentId,
                    nationalId: row.nationalId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    gender: row.gender,
                    age: row.age,
                    class: row.class,
                    schoolId,
                }));
            // A unique conflict rolls back and retries identity reconciliation
            // against a fresh snapshot before attaching any PHQ results.
            const createdStudents = newStudents.length > 0
                ? await tx.student.createManyAndReturn({
                      data: newStudents,
                      select: { id: true, studentId: true },
                  })
                : [];
            const createdIdByStudentCode = new Map(
                createdStudents.map((student) => [student.studentId, student.id]),
            );

            const studentUpdates: Promise<unknown>[] = [];
            for (const { row, existingStudent: student } of rowsToMutate) {
                if (!student) continue;

                const updates: {
                    age?: number;
                    class?: string;
                    firstName?: string;
                    gender?: ParsedStudent["gender"];
                    lastName?: string;
                    nationalId?: string;
                } = {};
                if (student.nationalId === null && row.nationalId !== null) {
                    updates.nationalId = row.nationalId;
                }
                if (student.gender !== row.gender) {
                    updates.gender = row.gender;
                }
                if (student.age !== row.age) {
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
                // Policy: student master fields follow the last import that
                // commits after Serializable conflict retries; fields are not merged.
                await Promise.all(studentUpdates);
            }

            const importedStudents: ImportStudentSummary[] = [];
            const phqResultsToCreate: Prisma.PhqResultCreateManyInput[] = [];

            for (const entry of rowsToMutate) {
                const { row, existingStudent } = entry;
                const studentId = existingStudent?.id ?? createdIdByStudentCode.get(row.studentId);
                if (!studentId) throw new Error("Import did not persist a resolved student");
                const { totalScore, riskLevel } = calculateRiskLevel(row.scores);
                phqResultsToCreate.push({
                    studentId,
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
                importedStudents.push(summarizeResolvedRow(entry));
            }

            if (phqResultsToCreate.length > 0) {
                const createdPhq = await tx.phqResult.createMany({
                    data: phqResultsToCreate,
                });
                if (createdPhq.count !== phqResultsToCreate.length) {
                    throw new Error("Import did not persist all PHQ results");
                }

                const createdPhqResults =
                    canGenerateActivitiesForAssessmentRound(assessmentRound)
                        ? await tx.phqResult.findMany({
                              where: {
                                  studentId: {
                                      in: phqResultsToCreate.map(
                                          (record) => record.studentId,
                                      ),
                                  },
                                  academicYearId: resolvedAcademicYearId,
                                  assessmentRound,
                              },
                              select: {
                                  id: true,
                                  studentId: true,
                                  riskLevel: true,
                              },
                          })
                        : [];

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
                    });
                }
            }

            return {
                importedCount: phqResultsToCreate.length,
                duplicateRoundErrors,
                duplicateRoundFailures,
                importedStudents,
                createdStudentCount: createdStudents.length,
                updatedStudentCount: studentUpdates.length,
                identityConflictErrors,
                identityConflictFailures,
                classAccessFailures,
            };
        });

        if ("numericAcknowledgementRequired" in txResult) {
            // Nothing was written; keep the diagnostics already computed for this batch.
            const ackErrors = [
                ...errors,
                ...txResult.identityConflictErrors,
                ...txResult.duplicateRoundErrors,
            ];
            const ackFailures = [
                ...failedStudents,
                ...txResult.identityConflictFailures,
                ...txResult.duplicateRoundFailures,
                ...txResult.classAccessFailures,
            ];
            return finishImport({
                success: false,
                status: "error",
                message: NUMERIC_ID_ACK_REQUIRED_MESSAGE,
                imported: 0,
                ...(ackErrors.length > 0 ? { errors: ackErrors } : {}),
                ...(ackFailures.length > 0 ? { failedStudents: ackFailures } : {}),
            });
        }

        errors.push(
            ...txResult.identityConflictErrors,
            ...txResult.duplicateRoundErrors,
        );
        failedStudents.push(
            ...txResult.identityConflictFailures,
            ...txResult.duplicateRoundFailures,
            ...txResult.classAccessFailures,
        );
        skippedCount += txResult.classAccessFailures.length;

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
            identityConflicts: txResult.identityConflictFailures.length,
            errors: failedCount > 0 ? errors : undefined,
            importedStudents: txResult.importedStudents,
            failedStudents:
                failedStudents.length > 0 ? failedStudents : undefined,
        });
    } catch (error) {
        if (importIdempotencyKey && shouldClearImportIdempotency) {
            await clearIdempotentOperation(importIdempotencyKey);
        }

        logError("Import students error:", {
            name: error instanceof Error ? error.name : typeof error,
            code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
        });
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
    db: Pick<Prisma.TransactionClient, "user" | "student"> = prisma,
): Promise<EditableStudentProfileRecord | string> {
    const user = await db.user.findUnique({
        where: { id: params.userId },
        select: {
            schoolId: true,
            teacher: { select: { advisoryClass: true } },
        },
    });

    if (!user?.schoolId) {
        return "ไม่พบโรงเรียนของคุณ";
    }

    const student = await db.student.findFirst({
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
    db: Pick<Prisma.TransactionClient, "phqResult"> = prisma,
): Promise<string | null> {
    const latestPhqResult = await db.phqResult.findFirst({
        where: { studentId },
        orderBy: LATEST_PHQ_ORDER_BY,
        select: { id: true },
    });

    if (!latestPhqResult) {
        return "แก้ไขข้อมูลได้เฉพาะนักเรียนที่มีข้อมูลนำเข้าล่าสุดเท่านั้น";
    }

    return latestPhqResult.id === context.activePhqResultId
        ? null
        : HISTORICAL_PROFILE_CONTEXT_MESSAGE;
}

async function validateStudentProfileUpdateRules(
    student: EditableStudentProfileRecord,
    input: StudentProfileUpdateInput,
): Promise<string | null> {
    if (input.class !== student.class) {
        return "ห้องเรียนแก้ไขได้จากการนำเข้าข้อมูลเท่านั้น";
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
    context: StudentProfileUpdateContext,
): Promise<UpdatedStudentProfile | null> {
    return runSerializableTransaction(async (tx) => {
        const latestPhqResult = await tx.phqResult.findFirst({
            where: { studentId: student.id },
            orderBy: LATEST_PHQ_ORDER_BY,
            select: { id: true },
        });
        if (latestPhqResult?.id !== context.activePhqResultId) {
            return null;
        }

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
        if (!currentStudent || currentStudent.schoolId !== student.schoolId || currentStudent.class !== student.class) {
            return null;
        }

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

        const updatedStudent = await saveStudentProfileUpdate(
            student,
            validated,
            updateContext,
        );
        if (!updatedStudent) {
            return {
                success: false,
                message: HISTORICAL_PROFILE_CONTEXT_MESSAGE,
            };
        }
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

type StudentIdentifierResult =
    | { success: true; masked: string | null; updatedAt: string }
    | { success: false; message: string };

function maskStoredStudentIdentifier(nationalId: string | null): string | null {
    return nationalId === null || isValidNationalId(nationalId) ? maskNationalId(nationalId) : "[ปิดบัง]";
}

export async function getStudentIdentifierForEdit(studentId: string): Promise<StudentIdentifierResult> {
    try {
        const { user } = await requireAuth();
        if (user.role !== "school_admin") {
            return { success: false, message: "คุณไม่มีสิทธิ์จัดการเลขประจำตัวนักเรียน" };
        }
        const student = await getEditableStudentProfile({ studentId, userId: user.id, userRole: user.role });
        if (typeof student === "string") return { success: false, message: student };

        const identifier = await prisma.student.findFirst({
            where: { id: student.id, schoolId: student.schoolId, status: "ACTIVE", disabledAt: null },
            select: { nationalId: true, updatedAt: true },
        });
        if (!identifier) return { success: false, message: "ไม่พบนักเรียนที่แก้ไขเลขประจำตัวได้" };

        return {
            success: true,
            masked: maskStoredStudentIdentifier(identifier.nationalId),
            updatedAt: identifier.updatedAt.toISOString(),
        };
    } catch {
        return { success: false, message: "ไม่สามารถโหลดข้อมูลเลขประจำตัวได้" };
    }
}

export async function updateStudentIdentifier(
    studentId: string,
    input: unknown,
    context: unknown,
): Promise<{ success: boolean; message: string }> {
    try {
        const { user } = await requireAuth();
        if (user.role !== "school_admin") {
            return { success: false, message: "คุณไม่มีสิทธิ์จัดการเลขประจำตัวนักเรียน" };
        }
        const parsed = studentIdentifierUpdateSchema.safeParse(input);
        if (!parsed.success) {
            const reasonIssue = parsed.error.issues.find((issue) => issue.path[0] === "reason");
            return {
                success: false,
                message: reasonIssue?.message ?? "กรุณาระบุเลขประจำตัวที่ถูกต้องหรือเลือกคำสั่งล้างเลข",
            };
        }
        const editContext = getStudentProfileUpdateContext(context);
        if (typeof editContext === "string") return { success: false, message: editContext };

        const saved = await runSerializableTransaction(async (tx) => {
            const student = await getEditableStudentProfile({ studentId, userId: user.id, userRole: user.role }, tx);
            if (typeof student === "string") return student;
            const contextError = await validateLatestImportedProfileContext(student.id, editContext, tx);
            if (contextError) return contextError;

            const { expectedUpdatedAt, nationalId, reason } = parsed.data;
            const where = {
                id: student.id, schoolId: student.schoolId, status: "ACTIVE", disabledAt: null,
                updatedAt: expectedUpdatedAt,
            } satisfies Prisma.StudentWhereInput;
            const current = await tx.student.findFirst({ where, select: { nationalId: true } });
            const conflict = "ข้อมูลนักเรียนมีการเปลี่ยนแปลง กรุณาเปิดรายการแก้ไขอีกครั้ง";
            if (!current) return conflict;
            if (current.nationalId === nationalId) return { changed: false } as const;

            // Always advance the optimistic version, including two changes within the same millisecond.
            const updatedAt = new Date(Math.max(Date.now(), expectedUpdatedAt.getTime() + 1));
            const update = await tx.student.updateMany({ where, data: { nationalId, updatedAt } });
            if (update.count !== 1) return conflict;

            await tx.studentIdentifierAuditEvent.create({
                data: {
                    studentId: student.id,
                    schoolId: student.schoolId,
                    actorUserId: user.id,
                    actorRole: user.role,
                    action: nationalId === null ? "CLEARED" : current.nationalId === null ? "ADDED" : "REPLACED",
                    previousMasked: maskStoredStudentIdentifier(current.nationalId),
                    newMasked: maskNationalId(nationalId),
                    reason,
                },
            });
            return { changed: true, schoolId: student.schoolId } as const;
        });
        if (typeof saved === "string") return { success: false, message: saved };
        if (!saved.changed) return { success: true, message: "เลขประจำตัวไม่มีการเปลี่ยนแปลง" };

        revalidateStudentsCache(saved.schoolId, studentId);
        revalidatePath(`/students/${studentId}`);
        return { success: true, message: "บันทึกเลขประจำตัวสำเร็จ" };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" &&
            Array.isArray(error.meta?.target) && error.meta.target.includes("nationalId")) {
            return { success: false, message: "เลขประจำตัวนี้มีอยู่ในระบบแล้ว" };
        }
        logError("Update student identifier error", {
            name: error instanceof Error ? error.name : typeof error,
            code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
        });
        return { success: false, message: "ไม่สามารถบันทึกเลขประจำตัวได้" };
    }
}
