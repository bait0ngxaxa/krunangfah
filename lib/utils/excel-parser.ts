import { type PhqScores } from "./phq-scoring";
import { normalizeClassName } from "./class-normalizer";
import {
    MAX_IMPORT_FILE_SIZE_BYTES,
    MAX_IMPORT_ROW_COUNT,
} from "@/lib/constants/import";
import { PHQA_SCORE_LABELS } from "@/lib/constants/phq-score-labels";
import { logError } from "@/lib/utils/logging";
import {
    isValidNationalId,
    NATIONAL_ID_ERROR_MESSAGE,
    normalizeNationalId,
} from "@/lib/utils/national-id";

export type ParsedGender = "MALE" | "FEMALE";
const NATIONAL_ID_HEADER = "เลขบัตรประชาชน";
const PHQA_TEMPLATE_HEADERS = {
    q1: "ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกซึม เศร้า หงุดหงิด หรือสิ้นหวัง",
    q2: "ในช่วง 2 สัปดาห์ที่ผ่านมา เบื่อ ไม่ค่อยสนใจหรือเพลิดเพลินเวลาทำสิ่งต่างๆ",
    q3: "ในช่วง 2 สัปดาห์ที่ผ่านมา นอนหลับยาก รู้สึกง่วงทั้งวันหรือนอนมากเกินไป",
    q4: "ในช่วง 2 สัปดาห์ที่ผ่านมา ไม่อยากอาหาร น้ำหนักลด หรือกินมากกว่าปกติ",
    q5: "ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกเหนื่อยล้าหรือไม่ค่อยมีพลัง",
    q6: "ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกแย่กับตัวเอง หรือรู้สึกว่าตัวเองล้มเหลว",
    q7: "ในช่วง 2 สัปดาห์ที่ผ่านมา จดจ่อกับสิ่งต่างๆได้ยาก เช่น ทำการบ้าน",
    q8: "ในช่วง 2 สัปดาห์ที่ผ่านมา พูดหรือทำอะไรช้าลงมาก จนคนอื่นสังเกตุเห็นได้",
    q9: "ในช่วง 2 สัปดาห์ที่ผ่านมา คิดว่าถ้าตายไปเสียจะดีกว่า",
    q9a: "ใน 1 เดือนที่ผ่านมา มีช่วงไหนที่คุณคิดอยากตาย หรือไม่คิดอยากมีชีวิตอยู่อย่างจริงจังหรือไม่",
    q9b: "ตลอดชีวิตที่ผ่านมา คุณเคยพยายามที่ทำให้ตัวเองตายหรือลงมือฆ่าตัวตายหรือไม่",
} as const;
const FIELD_HEADER_ALIASES = {
    gender: ["เพศ", "เพศกำเนิด"],
    age: ["อายุ", "อายุ (ปี)"],
    class: ["ห้อง", "ห้องเรียน"],
    q1: [PHQA_TEMPLATE_HEADERS.q1, "ข้อ1"],
    q2: [PHQA_TEMPLATE_HEADERS.q2, "ข้อ2"],
    q3: [PHQA_TEMPLATE_HEADERS.q3, "ข้อ3"],
    q4: [PHQA_TEMPLATE_HEADERS.q4, "ข้อ4"],
    q5: [PHQA_TEMPLATE_HEADERS.q5, "ข้อ5"],
    q6: [PHQA_TEMPLATE_HEADERS.q6, "ข้อ6"],
    q7: [PHQA_TEMPLATE_HEADERS.q7, "ข้อ7"],
    q8: [PHQA_TEMPLATE_HEADERS.q8, "ข้อ8"],
    q9: [PHQA_TEMPLATE_HEADERS.q9, "ข้อ9"],
    q9a: [PHQA_TEMPLATE_HEADERS.q9a, "ข้อ9a", "opt1"],
    q9b: [PHQA_TEMPLATE_HEADERS.q9b, "ข้อ9b", "opt2"],
} as const;

interface RequiredImportField {
    label: string;
    aliases: readonly string[];
}

const REQUIRED_IMPORT_FIELDS: readonly RequiredImportField[] = [
    { label: "รหัสนักเรียน", aliases: ["รหัสนักเรียน"] },
    { label: NATIONAL_ID_HEADER, aliases: [NATIONAL_ID_HEADER] },
    { label: "ชื่อ", aliases: ["ชื่อ"] },
    { label: "นามสกุล", aliases: ["นามสกุล"] },
    { label: "เพศกำเนิด", aliases: FIELD_HEADER_ALIASES.gender },
    { label: "อายุ (ปี)", aliases: FIELD_HEADER_ALIASES.age },
    { label: "ห้องเรียน", aliases: FIELD_HEADER_ALIASES.class },
    { label: PHQA_TEMPLATE_HEADERS.q1, aliases: FIELD_HEADER_ALIASES.q1 },
    { label: PHQA_TEMPLATE_HEADERS.q2, aliases: FIELD_HEADER_ALIASES.q2 },
    { label: PHQA_TEMPLATE_HEADERS.q3, aliases: FIELD_HEADER_ALIASES.q3 },
    { label: PHQA_TEMPLATE_HEADERS.q4, aliases: FIELD_HEADER_ALIASES.q4 },
    { label: PHQA_TEMPLATE_HEADERS.q5, aliases: FIELD_HEADER_ALIASES.q5 },
    { label: PHQA_TEMPLATE_HEADERS.q6, aliases: FIELD_HEADER_ALIASES.q6 },
    { label: PHQA_TEMPLATE_HEADERS.q7, aliases: FIELD_HEADER_ALIASES.q7 },
    { label: PHQA_TEMPLATE_HEADERS.q8, aliases: FIELD_HEADER_ALIASES.q8 },
    { label: PHQA_TEMPLATE_HEADERS.q9, aliases: FIELD_HEADER_ALIASES.q9 },
    { label: PHQA_TEMPLATE_HEADERS.q9a, aliases: FIELD_HEADER_ALIASES.q9a },
    { label: PHQA_TEMPLATE_HEADERS.q9b, aliases: FIELD_HEADER_ALIASES.q9b },
];

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
        for (const field of REQUIRED_IMPORT_FIELDS) {
            if (findHeaderColumn(headers, field.aliases) === undefined) {
                errors.push(`ไม่พบคอลัมน์ "${field.label}" ในไฟล์`);
            }
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

                const requiredValues = REQUIRED_IMPORT_FIELDS.map((field) => ({
                    label: field.label,
                    value: getCellByAliases(field.aliases),
                }));
                const hasAnyRequiredValue = requiredValues.some(
                    (field) => field.value.length > 0,
                );
                if (!hasAnyRequiredValue) return;

                const missingFields = requiredValues
                    .filter((field) => field.value.length === 0)
                    .map((field) => field.label);
                if (missingFields.length > 0) {
                    errors.push(
                        `แถว ${rowNumber}: ขาดข้อมูลในฟิลด์: ${missingFields.join(", ")}`,
                    );
                    return;
                }

                const getNumberCell = (
                    headerName: string,
                    aliases: readonly string[] = [headerName],
                ): number => {
                    const value = getCellByAliases(aliases).trim();

                    if (!value) {
                        errors.push(`แถว ${rowNumber}: ไม่มีข้อมูล${headerName}`);
                        return 0;
                    }

                    const mappedScore = parsePhqaScoreLabel(value);
                    if (mappedScore !== undefined) {
                        return mappedScore;
                    }

                    const num = parseInt(value, 10);

                    // ตรวจสอบว่าเป็นตัวเลขที่ valid
                    if (isNaN(num)) {
                        errors.push(
                            `แถว ${rowNumber}: ${headerName} ต้องเป็นคำตอบที่รองรับ (พบ: "${value}")`,
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

                    if (!value) {
                        errors.push(`แถว ${rowNumber}: ไม่มีข้อมูล${headerName}`);
                        return false;
                    }

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

                if (!gender) {
                    errors.push(
                        `แถว ${rowNumber}: เพศกำเนิดต้องเป็น "ชาย" หรือ "หญิง"`,
                    );
                    return;
                }
                if (age === undefined) {
                    errors.push(
                        `แถว ${rowNumber}: อายุ (ปี) ต้องเป็นตัวเลข 1-100`,
                    );
                    return;
                }

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
                if (!isValidNationalId(nationalId)) {
                    errors.push(
                        `แถว ${rowNumber}: ${NATIONAL_ID_ERROR_MESSAGE}`,
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
                        q1: getNumberCell(PHQA_TEMPLATE_HEADERS.q1, FIELD_HEADER_ALIASES.q1),
                        q2: getNumberCell(PHQA_TEMPLATE_HEADERS.q2, FIELD_HEADER_ALIASES.q2),
                        q3: getNumberCell(PHQA_TEMPLATE_HEADERS.q3, FIELD_HEADER_ALIASES.q3),
                        q4: getNumberCell(PHQA_TEMPLATE_HEADERS.q4, FIELD_HEADER_ALIASES.q4),
                        q5: getNumberCell(PHQA_TEMPLATE_HEADERS.q5, FIELD_HEADER_ALIASES.q5),
                        q6: getNumberCell(PHQA_TEMPLATE_HEADERS.q6, FIELD_HEADER_ALIASES.q6),
                        q7: getNumberCell(PHQA_TEMPLATE_HEADERS.q7, FIELD_HEADER_ALIASES.q7),
                        q8: getNumberCell(PHQA_TEMPLATE_HEADERS.q8, FIELD_HEADER_ALIASES.q8),
                        q9: getNumberCell(PHQA_TEMPLATE_HEADERS.q9, FIELD_HEADER_ALIASES.q9),
                        q9a: getBooleanCell(
                            PHQA_TEMPLATE_HEADERS.q9a,
                            FIELD_HEADER_ALIASES.q9a,
                        ),
                        q9b: getBooleanCell(
                            PHQA_TEMPLATE_HEADERS.q9b,
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
