import ExcelJS from "exceljs";
import { type PhqScores } from "./phq-scoring";
import { normalizeClassName } from "./class-normalizer";

export type ParsedGender = "MALE" | "FEMALE";

export interface ParsedStudent {
    studentId: string;
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

/**
 * Parse Excel buffer to student data
 */
export async function parseExcelBuffer(
    buffer: ArrayBuffer,
): Promise<ParseResult> {
    const errors: string[] = [];
    const data: ParsedStudent[] = [];

    try {
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

        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = String(cell.value || "").trim();
        });

        // Validate required headers
        const requiredHeaders = ["รหัสนักเรียน", "ชื่อ", "นามสกุล", "ห้อง"];
        for (const header of requiredHeaders) {
            if (!headers.includes(header)) {
                errors.push(`ไม่พบคอลัมน์ "${header}" ในไฟล์`);
            }
        }

        if (errors.length > 0) {
            return { success: false, data: [], errors };
        }

        // Parse rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            try {
                const getCell = (headerName: string): string => {
                    const colIndex = headers.indexOf(headerName);
                    if (colIndex === -1) return "";
                    const cellValue = row.getCell(colIndex).value;
                    return String(cellValue ?? "").trim();
                };

                const getNumberCell = (headerName: string): number => {
                    const value = getCell(headerName).trim();

                    // ถ้าว่างเปล่า → ให้เป็น 0
                    if (!value) return 0;

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

                const getBooleanCell = (headerName: string): boolean => {
                    const value = getCell(headerName).trim().toLowerCase();

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
                const genderRaw = getCell("เพศ");
                const gender = parseGender(genderRaw);
                const ageRaw = getCell("อายุ");
                const ageParsed = parseInt(ageRaw, 10);
                const age =
                    !isNaN(ageParsed) && ageParsed > 0 && ageParsed <= 100
                        ? ageParsed
                        : undefined;
                const studentClass = getCell("ห้อง");
                const studentId = getCell("รหัสนักเรียน");

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

                const student: ParsedStudent = {
                    studentId,
                    firstName,
                    lastName,
                    gender,
                    age,
                    class: normalizeClassName(studentClass),
                    scores: {
                        q1: getNumberCell("ข้อ1"),
                        q2: getNumberCell("ข้อ2"),
                        q3: getNumberCell("ข้อ3"),
                        q4: getNumberCell("ข้อ4"),
                        q5: getNumberCell("ข้อ5"),
                        q6: getNumberCell("ข้อ6"),
                        q7: getNumberCell("ข้อ7"),
                        q8: getNumberCell("ข้อ8"),
                        q9: getNumberCell("ข้อ9"),
                        q9a: getBooleanCell("ข้อ9a"),
                        q9b: getBooleanCell("ข้อ9b"),
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

        data.forEach((student) => {
            if (studentIdSet.has(student.studentId)) {
                duplicateSet.add(student.studentId);
            } else {
                studentIdSet.add(student.studentId);
            }
        });

        const duplicateStudentIds = [...duplicateSet];

        if (duplicateStudentIds.length > 0) {
            errors.push(
                `พบรหัสนักเรียนซ้ำในไฟล์: ${duplicateStudentIds.join(", ")}`,
            );
        }

        return {
            success: errors.length === 0,
            data,
            errors,
        };
    } catch (err) {
        console.error("Excel parse error:", err);
        return {
            success: false,
            data: [],
            errors: ["ไม่สามารถอ่านไฟล์ Excel ได้"],
        };
    }
}
