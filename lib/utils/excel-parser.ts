import { type PhqScores } from "./phq-scoring";
import { normalizeClassName } from "./class-normalizer";
import {
    MAX_IMPORT_FILE_SIZE_BYTES,
    MAX_IMPORT_ROW_COUNT,
} from "@/lib/constants/import";
import { logError } from "@/lib/utils/logging";

export type ParsedGender = "MALE" | "FEMALE";
const NATIONAL_ID_HEADER = "เลขบัตรประชาชน";
const PHQA_SCORE_LABELS = new Map<string, number>([
    ["ไม่มเลย", 0],
    ["ไม่มีเลย", 0],
    ["มีบางวัน", 1],
    ["มีมากกว่า 7 วัน", 2],
    ["มีแทบทุกวัน", 3],
]);
const FIELD_HEADER_ALIASES = {
    gender: ["เพศ", "เพศกำเนิด"],
    age: ["อายุ", "อายุ (ปี)"],
    class: ["ห้อง", "ห้องเรียน"],
    q1: ["ข้อ1", "รู้สึกซึม เศร้า หงุดหงิด หรือสิ้นหวัง"],
    q2: ["ข้อ2", "เบื่อ ไม่ค่อยสนใจหรือเพลิดเพลิน"],
    q3: ["ข้อ3", "นอนหลับยาก รู้สึกง่วงทั้งวันหรือนอนมากเกินไป"],
    q4: ["ข้อ4", "ไม่อยากอาหาร น้ำหนักลด หรือกินมากกว่าปกติ"],
    q5: ["ข้อ5", "รู้สึกเหนื่อยล้าหรือไม่ค่อยมีพลัง"],
    q6: ["ข้อ6", "รู้สึกแย่กับตัวเอง"],
    q7: ["ข้อ7", "จดจ่อกับสิ่งต่างๆได้ยาก"],
    q8: ["ข้อ8", "พูดหรือทำอะไรช้าลงมาก"],
    q9: ["ข้อ9", "คิดว่าถ้าตายไปเสียจะดีกว่า"],
    q9a: ["opt1", "ข้อ9a", "คิดอยากตาย หรือไม่คิดอยากมีชีวิตอยู่"],
    q9b: ["opt2", "ข้อ9b", "เคยพยายามที่ทำให้ตัวเองตาย"],
} as const;

export interface ParsedStudent {
    studentId: string;
    nationalId: string;
    firstName: string;
    lastName: string;
    gender?: ParsedGender;
    age?: number;
    class: string;
    scores: PhqScores;
}

export interface ParseResult {
    success: boolean;
    data: ParsedStudent[];
    errors: string[];
}

function normalizeNationalId(value: string): string | undefined {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return undefined;
    }

    const normalizedValue = trimmedValue.replace(/[-\s]/g, "");
    if (!/^\d{13}$/.test(normalizedValue)) {
        return undefined;
    }

    return normalizedValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function stringifyCellValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    if (
        isRecord(value) &&
        Array.isArray(value.richText)
    ) {
        return value.richText
            .map((part) =>
                isRecord(part) && typeof part.text === "string"
                    ? part.text
                    : "",
            )
            .join("");
    }

    if (isRecord(value) && typeof value.text === "string") {
        return value.text;
    }

    return String(value);
}

function normalizeHeader(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function findHeaderColumn(
    headers: Map<string, number>,
    aliases: readonly string[],
): number | undefined {
    const normalizedAliases = aliases.map(normalizeHeader);

    for (const alias of normalizedAliases) {
        const exactColumn = headers.get(alias);
        if (exactColumn !== undefined) {
            return exactColumn;
        }
    }

    for (const [header, column] of headers) {
        if (normalizedAliases.some((alias) => header.includes(alias))) {
            return column;
        }
    }

    return undefined;
}

function parsePhqaScoreLabel(value: string): number | undefined {
    const normalizedValue = normalizeHeader(value).toLowerCase();
    return PHQA_SCORE_LABELS.get(normalizedValue);
}

/**
 * Parse Excel buffer to student data
 * ExcelJS is dynamically imported to avoid bundling ~1MB into the client
 */
export async function parseExcelBuffer(
    buffer: ArrayBuffer,
): Promise<ParseResult> {
    const errors: string[] = [];
    const data: ParsedStudent[] = [];

    try {
        if (buffer.byteLength > MAX_IMPORT_FILE_SIZE_BYTES) {
            return {
                success: false,
                data: [],
                errors: [
                    `ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${Math.floor(MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024))}MB)`,
                ],
            };
        }

        // Dynamic import: ExcelJS is loaded only when user uploads a file
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        // @ts-expect-error - ExcelJS types don't match Node.js Buffer types
        await workbook.xlsx.load(Buffer.from(buffer));

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return {
                success: false,
                data: [],
                errors: ["ไม่พบ worksheet ในไฟล์"],
            };
        }

        // Map from header name → column number (reverse index for safe lookup)
        const headers = new Map<string, number>();
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers.set(normalizeHeader(stringifyCellValue(cell.value)), colNumber);
        });

        // Validate required headers
        const requiredHeaders = [
            "รหัสนักเรียน",
            NATIONAL_ID_HEADER,
            "ชื่อ",
            "นามสกุล",
        ];
        for (const header of requiredHeaders) {
            if (findHeaderColumn(headers, [header]) === undefined) {
                errors.push(`ไม่พบคอลัมน์ "${header}" ในไฟล์`);
            }
        }
        if (findHeaderColumn(headers, FIELD_HEADER_ALIASES.class) === undefined) {
            errors.push(`ไม่พบคอลัมน์ "ห้อง" ในไฟล์`);
        }

        if (errors.length > 0) {
            return { success: false, data: [], errors };
        }

        const dataRowCount = Math.max(worksheet.actualRowCount - 1, 0);
        if (dataRowCount > MAX_IMPORT_ROW_COUNT) {
            return {
                success: false,
                data: [],
                errors: [
                    `ไฟล์มีข้อมูลเกิน ${MAX_IMPORT_ROW_COUNT} แถว กรุณาแบ่งไฟล์แล้วนำเข้าใหม่`,
                ],
            };
        }

        // Parse rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            try {
                const getCell = (headerName: string): string => {
                    const colIndex = findHeaderColumn(headers, [headerName]) ?? -1;
                    if (colIndex === -1) return "";
                    const cellValue = row.getCell(colIndex).value;
                    return stringifyCellValue(cellValue).trim();
                };

                const getCellByAliases = (
                    aliases: readonly string[],
                ): string => {
                    const colIndex = findHeaderColumn(headers, aliases) ?? -1;
                    if (colIndex === -1) return "";
                    const cellValue = row.getCell(colIndex).value;
                    return stringifyCellValue(cellValue).trim();
                };

                const getNumberCell = (
                    headerName: string,
                    aliases: readonly string[] = [headerName],
                ): number => {
                    const value = getCellByAliases(aliases).trim();

                    // ถ้าว่างเปล่า → ให้เป็น 0
                    if (!value) return 0;

                    const mappedScore = parsePhqaScoreLabel(value);
                    if (mappedScore !== undefined) {
                        return mappedScore;
                    }

                    const num = parseInt(value, 10);

                    // ตรวจสอบว่าเป็นตัวเลขที่ valid
                    if (isNaN(num)) {
                        errors.push(
                            `แถว ${rowNumber}: ${headerName} ต้องเป็นตัวเลข (พบ: "${value}")`,
                        );
                        return 0;
                    }

                    // ตรวจสอบช่วง 0-3
                    if (num < 0 || num > 3) {
                        errors.push(
                            `แถว ${rowNumber}: ${headerName} ต้องอยู่ในช่วง 0-3 (พบ: ${num})`,
                        );
                        return Math.min(Math.max(num, 0), 3); // Clamp แต่มี warning
                    }

                    return num;
                };

                const getBooleanCell = (
                    headerName: string,
                    aliases: readonly string[] = [headerName],
                ): boolean => {
                    const value = getCellByAliases(aliases).trim().toLowerCase();

                    // ถ้าว่างเปล่า → ให้เป็น false
                    if (!value) return false;

                    // ค่าที่ยอมรับได้สำหรับ true
                    if (
                        value === "ใช่" ||
                        value === "yes" ||
                        value === "1" ||
                        value === "true"
                    ) {
                        return true;
                    }

                    // ค่าที่ยอมรับได้สำหรับ false
                    if (
                        value === "ไม่ใช่" ||
                        value === "no" ||
                        value === "0" ||
                        value === "false"
                    ) {
                        return false;
                    }

                    // ค่าที่ไม่ valid
                    errors.push(
                        `แถว ${rowNumber}: ${headerName} ต้องเป็น "ใช่" หรือ "ไม่ใช่" (พบ: "${value}")`,
                    );
                    return false;
                };

                const parseGender = (
                    value: string,
                ): ParsedGender | undefined => {
                    const normalized = value.trim().toLowerCase();
                    if (
                        normalized === "ชาย" ||
                        normalized === "male" ||
                        normalized === "m"
                    ) {
                        return "MALE";
                    }
                    if (
                        normalized === "หญิง" ||
                        normalized === "female" ||
                        normalized === "f"
                    ) {
                        return "FEMALE";
                    }
                    return undefined;
                };

                const firstName = getCell("ชื่อ");
                const lastName = getCell("นามสกุล");
                const genderRaw = getCellByAliases(FIELD_HEADER_ALIASES.gender);
                const gender = parseGender(genderRaw);
                const ageRaw = getCellByAliases(FIELD_HEADER_ALIASES.age);
                const ageParsed = parseInt(ageRaw, 10);
                const age =
                    !isNaN(ageParsed) && ageParsed > 0 && ageParsed <= 100
                        ? ageParsed
                        : undefined;
                const studentClass = getCellByAliases(FIELD_HEADER_ALIASES.class);
                const studentId = getCell("รหัสนักเรียน");
                const nationalIdRaw = getCell(NATIONAL_ID_HEADER);
                const nationalId = normalizeNationalId(nationalIdRaw);

                // Skip empty rows
                if (!firstName && !lastName) return;

                // Validate required fields
                if (!firstName) {
                    errors.push(`แถว ${rowNumber}: ไม่มีชื่อ`);
                    return;
                }
                if (!lastName) {
                    errors.push(`แถว ${rowNumber}: ไม่มีนามสกุล`);
                    return;
                }
                if (!studentClass) {
                    errors.push(`แถว ${rowNumber}: ไม่มีห้อง`);
                    return;
                }
                if (!studentId) {
                    errors.push(`แถว ${rowNumber}: ไม่มีรหัสนักเรียน`);
                    return;
                }
                if (!nationalIdRaw) {
                    errors.push(`แถว ${rowNumber}: ไม่มี${NATIONAL_ID_HEADER}`);
                    return;
                }
                if (!nationalId) {
                    errors.push(
                        `แถว ${rowNumber}: ${NATIONAL_ID_HEADER} ต้องเป็นตัวเลข 13 หลัก`,
                    );
                    return;
                }

                const student: ParsedStudent = {
                    studentId,
                    nationalId,
                    firstName,
                    lastName,
                    gender,
                    age,
                    class: normalizeClassName(studentClass),
                    scores: {
                        q1: getNumberCell("ข้อ1", FIELD_HEADER_ALIASES.q1),
                        q2: getNumberCell("ข้อ2", FIELD_HEADER_ALIASES.q2),
                        q3: getNumberCell("ข้อ3", FIELD_HEADER_ALIASES.q3),
                        q4: getNumberCell("ข้อ4", FIELD_HEADER_ALIASES.q4),
                        q5: getNumberCell("ข้อ5", FIELD_HEADER_ALIASES.q5),
                        q6: getNumberCell("ข้อ6", FIELD_HEADER_ALIASES.q6),
                        q7: getNumberCell("ข้อ7", FIELD_HEADER_ALIASES.q7),
                        q8: getNumberCell("ข้อ8", FIELD_HEADER_ALIASES.q8),
                        q9: getNumberCell("ข้อ9", FIELD_HEADER_ALIASES.q9),
                        q9a: getBooleanCell(
                            "opt1",
                            FIELD_HEADER_ALIASES.q9a,
                        ),
                        q9b: getBooleanCell(
                            "opt2",
                            FIELD_HEADER_ALIASES.q9b,
                        ),
                    },
                };

                data.push(student);
            } catch {
                errors.push(`แถว ${rowNumber}: เกิดข้อผิดพลาดในการอ่านข้อมูล`);
            }
        });

        // Check for duplicate studentId within the Excel file
        const studentIdSet = new Set<string>();
        const duplicateSet = new Set<string>();
        const nationalIdSet = new Set<string>();
        const duplicateNationalIdSet = new Set<string>();

        data.forEach((student) => {
            if (studentIdSet.has(student.studentId)) {
                duplicateSet.add(student.studentId);
            } else {
                studentIdSet.add(student.studentId);
            }

            if (nationalIdSet.has(student.nationalId)) {
                duplicateNationalIdSet.add(student.nationalId);
            } else {
                nationalIdSet.add(student.nationalId);
            }
        });

        const duplicateStudentIds = [...duplicateSet];

        if (duplicateStudentIds.length > 0) {
            errors.push(
                `พบรหัสนักเรียนซ้ำในไฟล์: ${duplicateStudentIds.join(", ")}`,
            );
        }

        const duplicateNationalIds = [...duplicateNationalIdSet];
        if (duplicateNationalIds.length > 0) {
            errors.push(
                `พบเลขบัตรประชาชนซ้ำในไฟล์: ${duplicateNationalIds.join(", ")}`,
            );
        }

        return {
            success: errors.length === 0,
            data,
            errors,
        };
    } catch (err) {
        logError("Excel parse error:", err);
        return {
            success: false,
            data: [],
            errors: ["ไม่สามารถอ่านไฟล์ Excel ได้"],
        };
    }
}
