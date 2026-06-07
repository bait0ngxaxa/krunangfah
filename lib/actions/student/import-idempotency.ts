import { createHash } from "crypto";
import type { ParsedStudent } from "@/lib/utils/excel-parser";
import type { ImportResult, ImportStudentSummary } from "./types";

function normalizeImportStudentForHash(student: ParsedStudent): Record<string, unknown> {
    return {
        studentId: student.studentId,
        nationalId: student.nationalId,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender ?? null,
        age: student.age ?? null,
        class: student.class,
        scores: {
            q1: student.scores.q1,
            q2: student.scores.q2,
            q3: student.scores.q3,
            q4: student.scores.q4,
            q5: student.scores.q5,
            q6: student.scores.q6,
            q7: student.scores.q7,
            q8: student.scores.q8,
            q9: student.scores.q9,
            q9a: student.scores.q9a,
            q9b: student.scores.q9b,
        },
    };
}

function createImportPayloadHash(students: ParsedStudent[]): string {
    const payload = students.map(normalizeImportStudentForHash);
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function createImportIdempotencyKey(input: {
    userId: string;
    schoolId: string;
    academicYearId: string;
    assessmentRound: number;
    students: ParsedStudent[];
}): string {
    return [
        "idem:import-students",
        input.userId,
        input.schoolId,
        input.academicYearId,
        input.assessmentRound.toString(),
        createImportPayloadHash(input.students),
    ].join(":");
}

function isImportStudentSummary(value: unknown): value is ImportStudentSummary {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    const record = value as Record<string, unknown>;
    return (
        typeof record.studentId === "string" &&
        typeof record.fullName === "string" &&
        typeof record.class === "string" &&
        (record.reason === undefined || typeof record.reason === "string")
    );
}

export function isImportResult(value: unknown): value is ImportResult {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    const record = value as Record<string, unknown>;
    const validStatus =
        record.status === "success" ||
        record.status === "partial" ||
        record.status === "error";

    return (
        typeof record.success === "boolean" &&
        validStatus &&
        typeof record.message === "string" &&
        (record.imported === undefined || typeof record.imported === "number") &&
        (record.skipped === undefined || typeof record.skipped === "number") &&
        (record.errors === undefined ||
            (Array.isArray(record.errors) &&
                record.errors.every((item) => typeof item === "string"))) &&
        (record.importedStudents === undefined ||
            (Array.isArray(record.importedStudents) &&
                record.importedStudents.every(isImportStudentSummary))) &&
        (record.failedStudents === undefined ||
            (Array.isArray(record.failedStudents) &&
                record.failedStudents.every(isImportStudentSummary)))
    );
}
