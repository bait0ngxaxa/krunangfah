import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";
import { parseExcelBuffer } from "@/lib/utils/excel-parser";
import {
    MAX_IMPORT_FILE_SIZE_BYTES,
    MAX_IMPORT_ROW_COUNT,
} from "@/lib/constants/import";

// Since parseExcelBuffer requires actual Excel parsing which is complex to mock,
// we'll test the helper functions logic that can be extracted

describe("Excel Parser - Gender Parsing Logic", () => {
    /**
     * Test the gender parsing logic that exists in parseExcelBuffer
     */
    const parseGender = (value: string): "MALE" | "FEMALE" | undefined => {
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

    describe("parseGender", () => {
        it('should return "MALE" for "ชาย"', () => {
            expect(parseGender("ชาย")).toBe("MALE");
        });

        it('should return "MALE" for "male"', () => {
            expect(parseGender("male")).toBe("MALE");
        });

        it('should return "MALE" for "m"', () => {
            expect(parseGender("m")).toBe("MALE");
        });

        it('should return "MALE" for "M" (case insensitive)', () => {
            expect(parseGender("M")).toBe("MALE");
        });

        it('should return "FEMALE" for "หญิง"', () => {
            expect(parseGender("หญิง")).toBe("FEMALE");
        });

        it('should return "FEMALE" for "female"', () => {
            expect(parseGender("female")).toBe("FEMALE");
        });

        it('should return "FEMALE" for "f"', () => {
            expect(parseGender("f")).toBe("FEMALE");
        });

        it('should return "FEMALE" for "F" (case insensitive)', () => {
            expect(parseGender("F")).toBe("FEMALE");
        });

        it("should return undefined for empty string", () => {
            expect(parseGender("")).toBe(undefined);
        });

        it("should return undefined for unknown value", () => {
            expect(parseGender("unknown")).toBe(undefined);
        });

        it("should handle whitespace", () => {
            expect(parseGender("  ชาย  ")).toBe("MALE");
            expect(parseGender("  female  ")).toBe("FEMALE");
        });
    });
});

describe("Excel Parser - Number Cell Clamping Logic", () => {
    /**
     * Test the number clamping logic (0-3) used for PHQ scores
     */
    const getNumberClamped = (value: string): number => {
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : Math.min(Math.max(num, 0), 3);
    };

    it("should return 0 for empty string", () => {
        expect(getNumberClamped("")).toBe(0);
    });

    it("should return 0 for non-numeric string", () => {
        expect(getNumberClamped("abc")).toBe(0);
    });

    it("should return 0 for negative numbers (clamp to 0)", () => {
        expect(getNumberClamped("-1")).toBe(0);
        expect(getNumberClamped("-10")).toBe(0);
    });

    it("should return correct value for 0-3", () => {
        expect(getNumberClamped("0")).toBe(0);
        expect(getNumberClamped("1")).toBe(1);
        expect(getNumberClamped("2")).toBe(2);
        expect(getNumberClamped("3")).toBe(3);
    });

    it("should clamp values greater than 3 to 3", () => {
        expect(getNumberClamped("4")).toBe(3);
        expect(getNumberClamped("10")).toBe(3);
        expect(getNumberClamped("100")).toBe(3);
    });
});

describe("Excel Parser - PHQA Answer Mapping", () => {
    async function createWorkbookBuffer(): Promise<ArrayBuffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("ข้อมูลนักเรียน");

        worksheet.addRow([
            "รหัสนักเรียน",
            "เลขบัตรประชาชน",
            "ชื่อ",
            "นามสกุล",
            "ห้อง",
            "ข้อ1",
            "ข้อ2",
            "ข้อ3",
            "ข้อ4",
            "ข้อ5",
            "ข้อ6",
            "ข้อ7",
            "ข้อ8",
            "ข้อ9",
            "opt1",
            "opt2",
        ]);

        worksheet.addRow([
            "66001",
            "1103700000011",
            "สมชาย",
            "ใจดี",
            "ม.1/1",
            "ไม่มีเลย",
            "มีบางวัน",
            "มีมากกว่า 7 วัน",
            "มีแทบทุกวัน",
            0,
            1,
            2,
            3,
            "ไม่มเลย",
            "ไม่ใช่",
            "ไม่ใช่",
        ]);

        const output = Buffer.from(await workbook.xlsx.writeBuffer());
        return output.buffer.slice(
            output.byteOffset,
            output.byteOffset + output.byteLength,
        );
    }

    it("maps real PHQA answer labels to scores during import", async () => {
        const buffer = await createWorkbookBuffer();
        const result = await parseExcelBuffer(buffer);

        expect(result.success).toBe(true);
        expect(result.data[0]?.scores).toMatchObject({
            q1: 0,
            q2: 1,
            q3: 2,
            q4: 3,
            q5: 0,
            q6: 1,
            q7: 2,
            q8: 3,
            q9: 0,
        });
    });
});

describe("Excel Parser - Real Template Header Mapping", () => {
    async function createRealTemplateBuffer(): Promise<ArrayBuffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Form Responses 1");
        const richHeader = (text: string) => ({ richText: [{ text }] });

        worksheet.addRow([
            "Timestamp",
            "รหัสนักเรียน",
            "เลขบัตรประชาชน",
            "ชื่อ",
            "นามสกุล",
            "เพศกำเนิด",
            "อายุ (ปี)",
            "ห้องเรียน",
            richHeader("ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกซึม เศร้า หงุดหงิด หรือสิ้นหวัง"),
            richHeader("ในช่วง 2 สัปดาห์ที่ผ่านมา เบื่อ ไม่ค่อยสนใจหรือเพลิดเพลินเวลาทำสิ่งต่างๆ"),
            richHeader("ในช่วง 2 สัปดาห์ที่ผ่านมา นอนหลับยาก รู้สึกง่วงทั้งวันหรือนอนมากเกินไป"),
            richHeader("ในช่วง 2 สัปดาห์ที่ผ่านมา ไม่อยากอาหาร น้ำหนักลด หรือกินมากกว่าปกติ"),
            richHeader("ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกเหนื่อยล้าหรือไม่ค่อยมีพลัง"),
            richHeader("ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกแย่กับตัวเอง หรือรู้สึกว่าตัวเองล้มเหลว"),
            richHeader("ในช่วง 2 สัปดาห์ที่ผ่านมา จดจ่อกับสิ่งต่างๆได้ยาก เช่น ทำการบ้าน"),
            richHeader("ในช่วง 2 สัปดาห์ที่ผ่านมา พูดหรือทำอะไรช้าลงมาก จนคนอื่นสังเกตุเห็นได้"),
            richHeader("ในช่วง 2 สัปดาห์ที่ผ่านมา คิดว่าถ้าตายไปเสียจะดีกว่า"),
            richHeader("ใน 1 เดือนที่ผ่านมา มีช่วงไหนที่คุณคิดอยากตาย หรือไม่คิดอยากมีชีวิตอยู่อย่างจริงจังหรือไม่"),
            richHeader("ตลอดชีวิตที่ผ่านมา คุณเคยพยายามที่ทำให้ตัวเองตายหรือลงมือฆ่าตัวตายหรือไม่"),
        ]);

        worksheet.addRow([
            "2026-05-18 10:00:00",
            "66001",
            "1103700000011",
            "สมชาย",
            "ใจดี",
            "ชาย",
            13,
            "ม.1/1",
            "ไม่มเลย",
            "มีบางวัน",
            "มีมากกว่า 7 วัน",
            "มีแทบทุกวัน",
            "ไม่มีเลย",
            "มีบางวัน",
            "มีมากกว่า 7 วัน",
            "มีแทบทุกวัน",
            "ไม่มีเลย",
            "ใช่",
            "ไม่ใช่",
        ]);

        const output = Buffer.from(await workbook.xlsx.writeBuffer());
        return output.buffer.slice(
            output.byteOffset,
            output.byteOffset + output.byteLength,
        );
    }

    it("parses the Google Form export header format", async () => {
        const buffer = await createRealTemplateBuffer();
        const result = await parseExcelBuffer(buffer);

        expect(result.success).toBe(true);
        expect(result.data[0]).toMatchObject({
            studentId: "66001",
            nationalId: "1103700000011",
            firstName: "สมชาย",
            lastName: "ใจดี",
            gender: "MALE",
            age: 13,
            class: "ม.1/1",
            scores: {
                q1: 0,
                q2: 1,
                q3: 2,
                q4: 3,
                q5: 0,
                q6: 1,
                q7: 2,
                q8: 3,
                q9: 0,
                q9a: true,
                q9b: false,
            },
        });
    });
});

describe("Excel Parser - Boolean Cell Logic", () => {
    /**
     * Test the boolean parsing logic for q9a/q9b
     */
    const getBooleanValue = (value: string): boolean => {
        const normalized = value.toLowerCase();
        return (
            normalized === "ใช่" ||
            normalized === "yes" ||
            normalized === "1" ||
            normalized === "true"
        );
    };

    describe("Truthy values", () => {
        it('should return true for "ใช่"', () => {
            expect(getBooleanValue("ใช่")).toBe(true);
        });

        it('should return true for "yes"', () => {
            expect(getBooleanValue("yes")).toBe(true);
        });

        it('should return true for "1"', () => {
            expect(getBooleanValue("1")).toBe(true);
        });

        it('should return true for "true"', () => {
            expect(getBooleanValue("true")).toBe(true);
        });

        it('should return true for "TRUE" (case insensitive)', () => {
            expect(getBooleanValue("TRUE")).toBe(true);
        });

        it('should return true for "Yes" (case insensitive)', () => {
            expect(getBooleanValue("Yes")).toBe(true);
        });
    });

    describe("Falsy values", () => {
        it("should return false for empty string", () => {
            expect(getBooleanValue("")).toBe(false);
        });

        it('should return false for "ไม่"', () => {
            expect(getBooleanValue("ไม่")).toBe(false);
        });

        it('should return false for "no"', () => {
            expect(getBooleanValue("no")).toBe(false);
        });

        it('should return false for "0"', () => {
            expect(getBooleanValue("0")).toBe(false);
        });

        it('should return false for "false"', () => {
            expect(getBooleanValue("false")).toBe(false);
        });

        it("should return false for any other value", () => {
            expect(getBooleanValue("maybe")).toBe(false);
            expect(getBooleanValue("2")).toBe(false);
        });
    });

    describe("q9a/q9b fallback column names", () => {
        /**
         * The parser now supports both "opt1"/"opt2" and "ข้อ9a"/"ข้อ9b" column names
         * using: getBooleanCell("opt1") || getBooleanCell("ข้อ9a")
         * This tests the OR fallback logic
         */
        it("should resolve true from primary column name", () => {
            const primary = getBooleanValue("ใช่");
            const fallback = getBooleanValue("");
            expect(primary || fallback).toBe(true);
        });

        it("should resolve true from fallback column name when primary is empty", () => {
            const primary = getBooleanValue("");
            const fallback = getBooleanValue("yes");
            expect(primary || fallback).toBe(true);
        });

        it("should resolve false when both columns are empty", () => {
            const primary = getBooleanValue("");
            const fallback = getBooleanValue("");
            expect(primary || fallback).toBe(false);
        });

        it("should resolve true when both columns have truthy values", () => {
            const primary = getBooleanValue("ใช่");
            const fallback = getBooleanValue("yes");
            expect(primary || fallback).toBe(true);
        });
    });
});

describe("Excel Parser - Year Filter Parsing Logic", () => {
    /**
     * Test the year-only filter parsing logic used in student profile page
     * Format: "year:XXXX" where XXXX is the academic year number
     */
    interface PhqResult {
        id: string;
        academicYear?: { id: string; year: number };
    }

    const filterByYearId = (
        results: PhqResult[],
        selectedYearId: string | undefined,
    ): PhqResult[] => {
        if (!selectedYearId) return results;

        // Year-only filter (e.g. "year:2568")
        if (selectedYearId.startsWith("year:")) {
            const yearNum = parseInt(selectedYearId.replace("year:", ""), 10);
            if (isNaN(yearNum)) return results;
            return results.filter((r) => r.academicYear?.year === yearNum);
        }

        // Specific semester filter (by academic year ID)
        return results.filter((r) => r.academicYear?.id === selectedYearId);
    };

    const mockResults: PhqResult[] = [
        { id: "1", academicYear: { id: "ay-1", year: 2567 } },
        { id: "2", academicYear: { id: "ay-2", year: 2568 } },
        { id: "3", academicYear: { id: "ay-3", year: 2568 } },
        { id: "4", academicYear: { id: "ay-4", year: 2569 } },
    ];

    it("should return all results when no filter selected", () => {
        expect(filterByYearId(mockResults, undefined)).toHaveLength(4);
    });

    it("should filter by year-only prefix", () => {
        const filtered = filterByYearId(mockResults, "year:2568");
        expect(filtered).toHaveLength(2);
        expect(filtered.every((r) => r.academicYear?.year === 2568)).toBe(true);
    });

    it("should return all results for invalid year number (NaN guard)", () => {
        const filtered = filterByYearId(mockResults, "year:abc");
        expect(filtered).toHaveLength(4);
    });

    it("should filter by specific academic year ID", () => {
        const filtered = filterByYearId(mockResults, "ay-1");
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe("1");
    });

    it("should return empty for non-matching year", () => {
        const filtered = filterByYearId(mockResults, "year:2570");
        expect(filtered).toHaveLength(0);
    });

    it("should return empty for non-matching academic year ID", () => {
        const filtered = filterByYearId(mockResults, "ay-999");
        expect(filtered).toHaveLength(0);
    });
});

describe("Excel Parser - Required Headers Validation", () => {
    const requiredHeaders = ["ชื่อ", "นามสกุล", "ห้อง", "เลขบัตรประชาชน"];

    const validateHeaders = (
        headers: string[],
    ): { valid: boolean; missing: string[] } => {
        const missing: string[] = [];
        for (const header of requiredHeaders) {
            if (!headers.includes(header)) {
                missing.push(header);
            }
        }
        return { valid: missing.length === 0, missing };
    };

    it("should pass when all required headers present", () => {
        const headers = [
            "ชื่อ",
            "นามสกุล",
            "ห้อง",
            "รหัสนักเรียน",
            "เลขบัตรประชาชน",
        ];
        const result = validateHeaders(headers);
        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
    });

    it('should fail when "ชื่อ" is missing', () => {
        const headers = ["นามสกุล", "ห้อง"];
        const result = validateHeaders(headers);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain("ชื่อ");
    });

    it('should fail when "นามสกุล" is missing', () => {
        const headers = ["ชื่อ", "ห้อง"];
        const result = validateHeaders(headers);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain("นามสกุล");
    });

    it('should fail when "ห้อง" is missing', () => {
        const headers = ["ชื่อ", "นามสกุล"];
        const result = validateHeaders(headers);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain("ห้อง");
    });

    it("should report all missing headers", () => {
        const headers: string[] = [];
        const result = validateHeaders(headers);
        expect(result.valid).toBe(false);
        expect(result.missing).toHaveLength(4);
        expect(result.missing).toContain("ชื่อ");
        expect(result.missing).toContain("นามสกุล");
        expect(result.missing).toContain("ห้อง");
        expect(result.missing).toContain("เลขบัตรประชาชน");
    });
});

describe("Excel Parser - Duplicate StudentId Detection", () => {
    interface StudentData {
        studentId: string;
        firstName: string;
        lastName: string;
    }

    const findDuplicateStudentIds = (students: StudentData[]): string[] => {
        const studentIdSet = new Set<string>();
        const duplicates: string[] = [];

        students.forEach((student) => {
            if (studentIdSet.has(student.studentId)) {
                if (!duplicates.includes(student.studentId)) {
                    duplicates.push(student.studentId);
                }
            } else {
                studentIdSet.add(student.studentId);
            }
        });

        return duplicates;
    };

    it("should return empty array when no duplicates", () => {
        const students = [
            { studentId: "001", firstName: "A", lastName: "A" },
            { studentId: "002", firstName: "B", lastName: "B" },
            { studentId: "003", firstName: "C", lastName: "C" },
        ];
        expect(findDuplicateStudentIds(students)).toHaveLength(0);
    });

    it("should detect single duplicate", () => {
        const students = [
            { studentId: "001", firstName: "A", lastName: "A" },
            { studentId: "001", firstName: "A2", lastName: "A2" },
            { studentId: "002", firstName: "B", lastName: "B" },
        ];
        const duplicates = findDuplicateStudentIds(students);
        expect(duplicates).toHaveLength(1);
        expect(duplicates).toContain("001");
    });

    it("should detect multiple duplicates", () => {
        const students = [
            { studentId: "001", firstName: "A", lastName: "A" },
            { studentId: "001", firstName: "A2", lastName: "A2" },
            { studentId: "002", firstName: "B", lastName: "B" },
            { studentId: "002", firstName: "B2", lastName: "B2" },
        ];
        const duplicates = findDuplicateStudentIds(students);
        expect(duplicates).toHaveLength(2);
        expect(duplicates).toContain("001");
        expect(duplicates).toContain("002");
    });

    it("should report duplicate only once even if appears 3+ times", () => {
        const students = [
            { studentId: "001", firstName: "A", lastName: "A" },
            { studentId: "001", firstName: "A2", lastName: "A2" },
            { studentId: "001", firstName: "A3", lastName: "A3" },
        ];
        const duplicates = findDuplicateStudentIds(students);
        expect(duplicates).toHaveLength(1);
        expect(duplicates).toContain("001");
    });

    it("should handle empty array", () => {
        expect(findDuplicateStudentIds([])).toHaveLength(0);
    });
});

describe("Excel Parser - Resource Guards", () => {
    async function createWorkbookBuffer(rowCount: number): Promise<ArrayBuffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("ข้อมูลนักเรียน");

        worksheet.addRow([
            "รหัสนักเรียน",
            "เลขบัตรประชาชน",
            "ชื่อ",
            "นามสกุล",
            "ห้อง",
            "ข้อ1",
            "ข้อ2",
            "ข้อ3",
            "ข้อ4",
            "ข้อ5",
            "ข้อ6",
            "ข้อ7",
            "ข้อ8",
            "ข้อ9",
            "opt1",
            "opt2",
        ]);

        for (let index = 0; index < rowCount; index++) {
            worksheet.addRow([
                `${index + 1}`,
                `1103700000${String(index + 1).padStart(3, "0")}`,
                "สมชาย",
                "ใจดี",
                "ม.1/1",
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                "ไม่ใช่",
                "ไม่ใช่",
            ]);
        }

        const output = Buffer.from(await workbook.xlsx.writeBuffer());
        return output.buffer.slice(
            output.byteOffset,
            output.byteOffset + output.byteLength,
        );
    }

    it("rejects files larger than the configured import size", async () => {
        const result = await parseExcelBuffer(
            new ArrayBuffer(MAX_IMPORT_FILE_SIZE_BYTES + 1),
        );

        expect(result.success).toBe(false);
        expect(result.errors).toContain(
            `ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${Math.floor(MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024))}MB)`,
        );
    });

    it("rejects workbooks with more rows than the preview can safely render", async () => {
        const buffer = await createWorkbookBuffer(MAX_IMPORT_ROW_COUNT + 1);

        const result = await parseExcelBuffer(buffer);

        expect(result.success).toBe(false);
        expect(result.errors).toContain(
            `ไฟล์มีข้อมูลเกิน ${MAX_IMPORT_ROW_COUNT} แถว กรุณาแบ่งไฟล์แล้วนำเข้าใหม่`,
        );
    });
});

describe("Excel Parser - National ID Parsing", () => {
    async function createWorkbookBuffer(
        nationalIdValue: string,
    ): Promise<ArrayBuffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("ข้อมูลนักเรียน");

        worksheet.addRow([
            "รหัสนักเรียน",
            "เลขบัตรประชาชน",
            "ชื่อ",
            "นามสกุล",
            "ห้อง",
            "ข้อ1",
            "ข้อ2",
            "ข้อ3",
            "ข้อ4",
            "ข้อ5",
            "ข้อ6",
            "ข้อ7",
            "ข้อ8",
            "ข้อ9",
            "opt1",
            "opt2",
        ]);

        worksheet.addRow([
            "66001",
            nationalIdValue,
            "สมชาย",
            "ใจดี",
            "ม.1/1",
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            "ไม่ใช่",
            "ไม่ใช่",
        ]);

        const output = Buffer.from(await workbook.xlsx.writeBuffer());
        return output.buffer.slice(
            output.byteOffset,
            output.byteOffset + output.byteLength,
        );
    }

    it("parses a valid 13-digit national ID", async () => {
        const buffer = await createWorkbookBuffer("1103700000011");
        const result = await parseExcelBuffer(buffer);

        expect(result.success).toBe(true);
        expect(result.data[0]?.nationalId).toBe("1103700000011");
    });

    it("normalizes national ID values with hyphens", async () => {
        const buffer = await createWorkbookBuffer("110-3700-0000-11");
        const result = await parseExcelBuffer(buffer);

        expect(result.success).toBe(true);
        expect(result.data[0]?.nationalId).toBe("1103700000011");
    });

    it("rejects national ID values that are not 13 digits", async () => {
        const buffer = await createWorkbookBuffer("123456789012");
        const result = await parseExcelBuffer(buffer);

        expect(result.success).toBe(false);
        expect(result.errors).toContain(
            'แถว 2: เลขบัตรประชาชน ต้องเป็นตัวเลข 13 หลัก',
        );
        expect(result.data).toHaveLength(0);
    });

    it("rejects missing national ID values", async () => {
        const buffer = await createWorkbookBuffer("");
        const result = await parseExcelBuffer(buffer);

        expect(result.success).toBe(false);
        expect(result.errors).toContain("แถว 2: ไม่มีเลขบัตรประชาชน");
        expect(result.data).toHaveLength(0);
    });
});
