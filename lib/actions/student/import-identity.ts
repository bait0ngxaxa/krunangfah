import { Prisma } from "@prisma/client";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

/*
 * Identity rules for student codes that arrived as numeric spreadsheet cells.
 *
 * Trust boundary: the Excel file is parsed in the browser, so
 * `numericStudentId` is client-supplied metadata. A modified client can omit
 * it and the row is then handled as a text code. Nothing here is a security
 * control; authorization, school isolation, class scope, national-ID
 * conflicts and DB constraints stay enforced independently of this flag.
 */

export const IMPORT_STUDENT_SELECT = {
    id: true,
    studentId: true,
    nationalId: true,
    firstName: true,
    lastName: true,
    class: true,
    age: true,
    gender: true,
    phqResults: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { academicYear: { select: { startDate: true } } },
    },
} satisfies Prisma.StudentSelect;

export interface ImportStudentRecord {
    id: string;
    nationalId: string | null;
    firstName: string;
    lastName: string;
    class: string;
    gender: ParsedStudent["gender"] | null;
    age: number | null;
    phqResults: { academicYear: { startDate: Date } }[];
}

export interface StoredImportStudent extends ImportStudentRecord {
    studentId: string;
}

/** `source` is the row as submitted; `row` carries the stored code once resolved. */
export interface ResolvedImportRow {
    row: ParsedStudent;
    source: ParsedStudent;
    existingStudent?: StoredImportStudent;
    nationalIdOwner?: { id: string };
}

export type NumericIdentityResolution =
    | { kind: "unmatched" }
    | { kind: "matched"; student: StoredImportStudent }
    | { kind: "review"; reason: string; candidates: StoredImportStudent[] };

export const NUMERIC_ID_ACK_REQUIRED_MESSAGE =
    "ต้องยืนยันการนำเข้ารหัสนักเรียนที่เป็นตัวเลขก่อน กรุณาลองใหม่";

const ALL_DIGITS = /^[0-9]+$/;

export function getImportAgeChange(row: ParsedStudent, existing: ImportStudentRecord): number | null {
    return existing.age === null ? null : row.age - existing.age;
}

export function normalizeImportName(name: string): string {
    return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Maps a code to the digits a spreadsheet would keep; all-zero codes map to "0", never "". */
export function zeroKey(studentId: string): string {
    return studentId.replace(/^0+/, "") || "0";
}

export function isAllDigitStudentId(studentId: string): boolean {
    return ALL_DIGITS.test(studentId);
}

/**
 * Finds same-school codes that differ from a key only by leading zeros.
 * `ltrim` cannot use the (studentId, schoolId) unique index; the scan is
 * bounded to one school through the (schoolId, class) index, so the cost is
 * linear in that school's student count. Running inside the import's
 * Serializable transaction is what stops a concurrent import from creating
 * "00123" while this one creates "123": the unique constraint cannot.
 */
async function findStudentIdsByZeroKey(
    tx: Prisma.TransactionClient,
    schoolId: string,
    keys: readonly string[],
): Promise<string[]> {
    if (keys.length === 0) return [];
    const trimmedKeys = keys.map((key) => (key === "0" ? "" : key));
    const rows = await tx.$queryRaw<{ studentId: string }[]>`
        SELECT "studentId" FROM "students"
        WHERE "schoolId" = ${schoolId}
          AND ltrim("studentId", '0') IN (${Prisma.join(trimmedKeys)})
    `;
    return rows.map((row) => row.studentId).filter(isAllDigitStudentId);
}

function groupByZeroKey(
    students: Iterable<StoredImportStudent>,
): Map<string, StoredImportStudent[]> {
    const groups = new Map<string, StoredImportStudent[]>();
    for (const student of students) {
        const key = zeroKey(student.studentId);
        groups.set(key, [...(groups.get(key) ?? []), student]);
    }
    return groups;
}

/** One raw query plus at most one record fetch per batch, keyed by zero key. */
export async function loadZeroKeyCandidates(
    tx: Prisma.TransactionClient,
    schoolId: string,
    rows: readonly ParsedStudent[],
    knownStudents: ReadonlyMap<string, StoredImportStudent>,
): Promise<Map<string, StoredImportStudent[]>> {
    const keys = [...new Set(
        rows.filter((row) => row.numericStudentId === true).map((row) => zeroKey(row.studentId)),
    )];
    const studentIds = await findStudentIdsByZeroKey(tx, schoolId, keys);
    const missing = studentIds.filter((studentId) => !knownStudents.has(studentId));
    const fetched = missing.length === 0
        ? []
        : await tx.student.findMany({
              where: { schoolId, studentId: { in: missing } },
              select: IMPORT_STUDENT_SELECT,
          });
    const fetchedById = new Map(fetched.map((student) => [student.studentId, student]));
    return groupByZeroKey(studentIds.flatMap((studentId) => {
        const student = knownStudents.get(studentId) ?? fetchedById.get(studentId);
        return student ? [student] : [];
    }));
}

/**
 * Used only when at least one side has no national ID.
 * The minor-typo name path deliberately does not count here.
 */
function hasNameAndDemographicEvidence(row: ParsedStudent, candidate: ImportStudentRecord): boolean {
    return (
        normalizeImportName(row.firstName) === normalizeImportName(candidate.firstName) &&
        normalizeImportName(row.lastName) === normalizeImportName(candidate.lastName) &&
        candidate.gender !== null &&
        candidate.gender === row.gender &&
        getImportAgeChange(row, candidate) !== null
    );
}

function formatCandidateIds(candidates: readonly StoredImportStudent[]): string {
    return candidates.map((candidate) => candidate.studentId).sort().join(", ");
}

function ambiguous(row: ParsedStudent, candidates: StoredImportStudent[]): NumericIdentityResolution {
    return {
        kind: "review",
        candidates,
        reason: `รหัสนักเรียน ${row.studentId} ตรงกับรหัสในระบบมากกว่าหนึ่งรายการ (${formatCandidateIds(candidates)}) กรุณาแก้รหัสในไฟล์ให้ตรงกับทะเบียนแล้วนำเข้าใหม่`,
    };
}

/**
 * Resolves a numeric-cell row against same-school records sharing its zero key.
 * Resolution is by identity evidence, never by padding or stripping digits.
 * The caller still applies class scope and `resolveImportIdentity` to the result.
 */
export function resolveNumericStudentIdentity(
    row: ParsedStudent,
    candidates: readonly StoredImportStudent[],
    nationalIdOwner: { id: string } | undefined,
): NumericIdentityResolution {
    const exact = candidates.find((candidate) => candidate.studentId === row.studentId);
    const others = candidates.filter((candidate) => candidate !== exact);

    if (exact) {
        return others.length === 0 ? { kind: "matched", student: exact } : ambiguous(row, [...candidates]);
    }
    if (others.length > 1) return ambiguous(row, others);

    const [candidate] = others;
    if (!candidate) return { kind: "unmatched" };
    // The national ID owner is a different student; let the existing conflict rule report it.
    if (nationalIdOwner && nationalIdOwner.id !== candidate.id) return { kind: "unmatched" };
    if (row.nationalId !== null && candidate.nationalId !== null) {
        if (row.nationalId === candidate.nationalId) return { kind: "matched", student: candidate };
        // Contradicting evidence: changing the code in the file would only hit the mismatch conflict.
        return {
            kind: "review",
            candidates: [candidate],
            reason: `เลขบัตรประชาชนของรหัสนักเรียน ${row.studentId} ไม่ตรงกับนักเรียนรหัส ${candidate.studentId} ในระบบ กรุณาตรวจรหัสนักเรียนและเลขบัตรประชาชนจากทะเบียนก่อนนำเข้า`,
        };
    }
    if (hasNameAndDemographicEvidence(row, candidate)) return { kind: "matched", student: candidate };

    return {
        kind: "review",
        candidates: [candidate],
        reason: `รหัสนักเรียน ${row.studentId} อาจตรงกับรหัส ${candidate.studentId} ที่มีในระบบ แต่ข้อมูลไม่พอยืนยันว่าเป็นคนเดียวกัน หากเป็นคนเดียวกัน ให้แก้รหัสในไฟล์เป็น ${candidate.studentId} (จัดรูปแบบเซลล์เป็นข้อความ) แล้วนำเข้าใหม่`,
    };
}

/**
 * A numeric 123 next to a text "00123" in the same file may be one student
 * typed twice. Returns the conflicting text codes, or an empty list.
 */
export function findInBatchZeroKeyConflicts(
    row: ParsedStudent,
    textIdsByZeroKey: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
    if (row.numericStudentId !== true) return [];
    const textIds = textIdsByZeroKey.get(zeroKey(row.studentId));
    return textIds ? [...textIds].filter((id) => id !== row.studentId).sort() : [];
}

export function indexTextIdsByZeroKey(rows: readonly ParsedStudent[]): Map<string, Set<string>> {
    const index = new Map<string, Set<string>>();
    for (const row of rows) {
        if (row.numericStudentId === true || !isAllDigitStudentId(row.studentId)) continue;
        const key = zeroKey(row.studentId);
        index.set(key, new Set([...(index.get(key) ?? []), row.studentId]));
    }
    return index;
}

/**
 * For a class teacher whose review candidates include another class: the
 * incoming student may still belong to this class, so "not your class"
 * would be false. Built from the submitted code only; it never names a candidate.
 */
export function formatUndisclosedReviewReason(row: ParsedStudent): string {
    return `รหัสนักเรียน ${row.studentId} อาจซ้ำกับนักเรียนที่มีในระบบ กรุณาติดต่อผู้ดูแลระบบของโรงเรียนเพื่อตรวจสอบรหัสก่อนนำเข้า`;
}

export function formatInBatchConflictReason(row: ParsedStudent, textIds: readonly string[]): string {
    return `รหัสนักเรียน ${row.studentId} อาจเป็นรหัสเดียวกับ ${textIds.join(", ")} ในไฟล์นี้ กรุณาแก้รหัสในไฟล์ให้ตรงกับทะเบียนแล้วนำเข้าใหม่`;
}

/** Server actions receive untrusted input; accept only `{ numericIdAcknowledged?: boolean }`. */
export function parseImportStudentsOptions(value: unknown): { numericIdAcknowledged: boolean } | null {
    if (value === undefined) return { numericIdAcknowledged: false };
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const keys = Object.keys(value);
    if (keys.some((key) => key !== "numericIdAcknowledged")) return null;
    const acknowledged: unknown = (value as Record<string, unknown>).numericIdAcknowledged;
    if (acknowledged !== undefined && typeof acknowledged !== "boolean") return null;
    return { numericIdAcknowledged: acknowledged === true };
}
