import type { ParsedStudent } from "@/lib/utils/excel-parser";
import {
    comparePhqAcademicChronology,
    getLatestPhqResult,
} from "@/lib/utils/phq-result-selection";
import type { ImportStudentRecord } from "./import-identity";

export interface ImportAssessmentContext {
    year: number;
    semester: number;
    assessmentRound: number;
}

export interface ImportStudentUpdates {
    age?: number;
    class?: string;
    firstName?: string;
    gender?: ParsedStudent["gender"];
    lastName?: string;
    nationalId?: string;
}

export interface ImportStudentUpdatePlan {
    updates: ImportStudentUpdates;
    /** Master fields differed but were kept because the file is older than stored data. */
    masterDataPreserved: boolean;
}

/**
 * True when the imported term/round precedes the student's latest PHQ by
 * academic chronology. An equal context is a duplicate round and is rejected
 * before this point, so the import instant only breaks a theoretical tie.
 */
export function isOlderThanLatestPhq(
    context: ImportAssessmentContext,
    phqResults: ImportStudentRecord["phqResults"],
    importedAt: Date,
): boolean {
    const latest = getLatestPhqResult(phqResults);
    if (!latest) return false;
    const imported = {
        id: "",
        academicYear: { year: context.year, semester: context.semester },
        assessmentRound: context.assessmentRound,
        createdAt: importedAt,
    };
    return comparePhqAcademicChronology(imported, latest) < 0;
}

/**
 * Master fields follow the newest assessment context, not the last file
 * committed. Filling a missing national ID is additive and always allowed.
 */
export function planImportStudentUpdates(
    student: ImportStudentRecord,
    row: ParsedStudent,
    isOlderContext: boolean,
): ImportStudentUpdatePlan {
    const updates: ImportStudentUpdates = {};
    if (student.nationalId === null && row.nationalId !== null) {
        updates.nationalId = row.nationalId;
    }

    const masterUpdates: ImportStudentUpdates = {
        ...(student.gender !== row.gender ? { gender: row.gender } : {}),
        ...(student.age !== row.age ? { age: row.age } : {}),
        ...(student.firstName !== row.firstName ? { firstName: row.firstName } : {}),
        ...(student.lastName !== row.lastName ? { lastName: row.lastName } : {}),
        ...(student.class !== row.class ? { class: row.class } : {}),
    };
    const hasMasterChanges = Object.keys(masterUpdates).length > 0;

    if (isOlderContext) {
        return { updates, masterDataPreserved: hasMasterChanges };
    }
    return { updates: { ...updates, ...masterUpdates }, masterDataPreserved: false };
}
