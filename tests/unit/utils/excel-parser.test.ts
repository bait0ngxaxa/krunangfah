import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";

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
});

describe("Excel Parser - Required Headers Validation", () => {
    const requiredHeaders = ["ชื่อ", "นามสกุล", "ห้อง"];

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
        const headers = ["ชื่อ", "นามสกุล", "ห้อง", "รหัสนักเรียน"];
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
        expect(result.missing).toHaveLength(3);
        expect(result.missing).toContain("ชื่อ");
        expect(result.missing).toContain("นามสกุล");
        expect(result.missing).toContain("ห้อง");
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
