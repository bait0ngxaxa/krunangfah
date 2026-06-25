import type { NamedSubmissionFilters, NamedSubmissionRecord } from "./types";

const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F]/g;
const FILE_EXTENSION = ".xlsx";
const MAX_FILENAME_LENGTH = 180;

function sanitizeFilenameSegment(value: string): string {
    return value
        .trim()
        .replace(INVALID_FILENAME_CHARACTERS, "-")
        .replace(/\s+/g, " ");
}

export function createNamedSubmissionFilename(
    records: NamedSubmissionRecord[],
    filters: NamedSubmissionFilters,
): string {
    const schoolName = records[0]?.student.school.name ?? "ไม่ระบุโรงเรียน";
    const parts = [
        "รายชื่อผลคัดกรอง",
        schoolName,
        filters.academicYear ? `ปี${filters.academicYear}` : "",
        filters.semester ? `เทอม${filters.semester}` : "",
        filters.assessmentRound ? `รอบ${filters.assessmentRound}` : "",
        filters.className ?? "",
    ]
        .filter(Boolean)
        .map(sanitizeFilenameSegment);
    const baseName = parts.join("_").slice(0, MAX_FILENAME_LENGTH - FILE_EXTENSION.length);

    return `${baseName}${FILE_EXTENSION}`;
}
