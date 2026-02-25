import { describe, it, expect } from "vitest";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import { calculateRiskLevel, type PhqScores } from "@/lib/utils/phq-scoring";

/**
 * Import Students Test Suite
 *
 * Tests the business logic for importing students with PHQ-A results.
 * Since importStudents is a server action with database dependencies,
 * we test the underlying logic functions and data transformations.
 */

describe("Import Students - Class Normalization Integration", () => {
    /**
     * When importing students, class names from Excel are normalized
     */
    it("should normalize various class formats during import", () => {
        const testCases = [
            { input: "ม. 2/5", expected: "ม.2/5" },
            { input: "m.2/5", expected: "ม.2/5" },
            { input: "M2/5", expected: "ม.2/5" },
            { input: "ม 3/1", expected: "ม.3/1" },
        ];

        testCases.forEach(({ input, expected }) => {
            expect(normalizeClassName(input)).toBe(expected);
        });
    });
});

describe("Import Students - PHQ Risk Calculation Integration", () => {
    const createScores = (overrides: Partial<PhqScores> = {}): PhqScores => ({
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        q5: 0,
        q6: 0,
        q7: 0,
        q8: 0,
        q9: 0,
        q9a: false,
        q9b: false,
        ...overrides,
    });

    /**
     * When importing students, risk levels are calculated from PHQ scores
     */
    it("should calculate correct risk level for low scores", () => {
        const scores = createScores({ q1: 1, q2: 1, q3: 1, q4: 1 });
        const result = calculateRiskLevel(scores);
        expect(result.riskLevel).toBe("blue");
        expect(result.totalScore).toBe(4);
    });

    it("should calculate correct risk level for moderate scores", () => {
        const scores = createScores({
            q1: 2,
            q2: 2,
            q3: 2,
            q4: 2,
            q5: 2,
        });
        const result = calculateRiskLevel(scores);
        expect(result.riskLevel).toBe("yellow");
        expect(result.totalScore).toBe(10);
    });

    it("should flag high risk for q9a = true", () => {
        const scores = createScores({ q1: 1, q2: 1, q9a: true });
        const result = calculateRiskLevel(scores);
        expect(result.riskLevel).toBe("red");
    });
});

describe("Import Students - Data Transformation", () => {
    interface ParsedStudent {
        studentId: string;
        firstName: string;
        lastName: string;
        gender?: "MALE" | "FEMALE";
        class: string;
        scores: PhqScores;
    }

    interface TransformedStudent {
        studentId: string;
        fullName: string;
        normalizedClass: string;
        riskLevel: string;
        totalScore: number;
    }

    /**
     * Transform parsed student data for database insertion
     */
    const transformStudent = (student: ParsedStudent): TransformedStudent => {
        const riskResult = calculateRiskLevel(student.scores);
        return {
            studentId: student.studentId,
            fullName: `${student.firstName} ${student.lastName}`,
            normalizedClass: normalizeClassName(student.class),
            riskLevel: riskResult.riskLevel,
            totalScore: riskResult.totalScore,
        };
    };

    it("should transform parsed student data correctly", () => {
        const parsed: ParsedStudent = {
            studentId: "12345",
            firstName: "สมชาย",
            lastName: "ใจดี",
            gender: "MALE",
            class: "ม 2/5",
            scores: {
                q1: 1,
                q2: 1,
                q3: 1,
                q4: 1,
                q5: 1,
                q6: 0,
                q7: 0,
                q8: 0,
                q9: 0,
                q9a: false,
                q9b: false,
            },
        };

        const result = transformStudent(parsed);

        expect(result.studentId).toBe("12345");
        expect(result.fullName).toBe("สมชาย ใจดี");
        expect(result.normalizedClass).toBe("ม.2/5");
        expect(result.riskLevel).toBe("green");
        expect(result.totalScore).toBe(5);
    });

    it("should handle students with high risk scores", () => {
        const parsed: ParsedStudent = {
            studentId: "67890",
            firstName: "สมหญิง",
            lastName: "สวยงาม",
            gender: "FEMALE",
            class: "M.3/1",
            scores: {
                q1: 3,
                q2: 3,
                q3: 3,
                q4: 3,
                q5: 3,
                q6: 3,
                q7: 0,
                q8: 0,
                q9: 0,
                q9a: false,
                q9b: false,
            },
        };

        const result = transformStudent(parsed);

        expect(result.normalizedClass).toBe("ม.3/1");
        expect(result.riskLevel).toBe("orange");
        expect(result.totalScore).toBe(18);
    });

    it("should handle q9a/q9b special flags", () => {
        const parsed: ParsedStudent = {
            studentId: "11111",
            firstName: "Test",
            lastName: "Student",
            class: "ม.1/1",
            scores: {
                q1: 0,
                q2: 0,
                q3: 0,
                q4: 0,
                q5: 0,
                q6: 0,
                q7: 0,
                q8: 0,
                q9: 0,
                q9a: true, // Critical flag
                q9b: false,
            },
        };

        const result = transformStudent(parsed);

        expect(result.riskLevel).toBe("red");
        expect(result.totalScore).toBe(0); // Score is 0 but risk is red
    });
});

describe("Import Students - Validation Rules", () => {
    interface ParsedStudent {
        studentId: string;
        firstName: string;
        lastName: string;
        class: string;
    }

    interface ValidationResult {
        valid: boolean;
        errors: string[];
    }

    /**
     * Validate student data before import
     */
    const validateStudent = (
        student: Partial<ParsedStudent>,
        rowNumber: number,
    ): ValidationResult => {
        const errors: string[] = [];

        if (!student.firstName) {
            errors.push(`แถว ${rowNumber}: ไม่มีชื่อ`);
        }

        if (!student.lastName) {
            errors.push(`แถว ${rowNumber}: ไม่มีนามสกุล`);
        }

        if (!student.class) {
            errors.push(`แถว ${rowNumber}: ไม่มีห้อง`);
        }

        if (!student.studentId) {
            errors.push(`แถว ${rowNumber}: ไม่มีรหัสนักเรียน`);
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    };

    it("should pass validation for complete student data", () => {
        const student = {
            studentId: "12345",
            firstName: "สมชาย",
            lastName: "ใจดี",
            class: "ม.2/5",
        };
        const result = validateStudent(student, 2);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("should fail validation for missing firstName", () => {
        const student = {
            studentId: "12345",
            firstName: "",
            lastName: "ใจดี",
            class: "ม.2/5",
        };
        const result = validateStudent(student, 2);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("แถว 2: ไม่มีชื่อ");
    });

    it("should fail validation for missing lastName", () => {
        const student = {
            studentId: "12345",
            firstName: "สมชาย",
            lastName: "",
            class: "ม.2/5",
        };
        const result = validateStudent(student, 2);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("แถว 2: ไม่มีนามสกุล");
    });

    it("should fail validation for missing class", () => {
        const student = {
            studentId: "12345",
            firstName: "สมชาย",
            lastName: "ใจดี",
            class: "",
        };
        const result = validateStudent(student, 3);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("แถว 3: ไม่มีห้อง");
    });

    it("should fail validation for missing studentId", () => {
        const student = {
            studentId: "",
            firstName: "สมชาย",
            lastName: "ใจดี",
            class: "ม.2/5",
        };
        const result = validateStudent(student, 4);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("แถว 4: ไม่มีรหัสนักเรียน");
    });

    it("should report multiple validation errors", () => {
        const student = {
            studentId: "",
            firstName: "",
            lastName: "",
            class: "",
        };
        const result = validateStudent(student, 5);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(4);
    });
});

describe("Import Students - ImportResult Type", () => {
    interface ImportResult {
        success: boolean;
        message: string;
        imported?: number;
        skipped?: number;
        errors?: string[];
    }

    const createSuccessResult = (
        imported: number,
        skipped: number,
    ): ImportResult => ({
        success: true,
        message: `นำเข้าสำเร็จ ${imported} คน`,
        imported,
        skipped,
    });

    const createFailureResult = (errors: string[]): ImportResult => ({
        success: false,
        message: "นำเข้าล้มเหลว",
        imported: 0,
        skipped: 0,
        errors,
    });

    it("should create success result with imported count", () => {
        const result = createSuccessResult(50, 2);
        expect(result.success).toBe(true);
        expect(result.imported).toBe(50);
        expect(result.skipped).toBe(2);
        expect(result.message).toContain("50");
    });

    it("should create failure result with errors", () => {
        const errors = ["Error 1", "Error 2"];
        const result = createFailureResult(errors);
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.imported).toBe(0);
    });
});

describe("Import Students - Access Control Logic", () => {
    type UserRole = "school_admin" | "class_teacher";

    interface User {
        role: UserRole;
        advisoryClass?: string;
        schoolId: string;
    }

    /**
     * Check if user can import students for a given class
     */
    const canImportForClass = (user: User, targetClass: string): boolean => {
        if (user.role === "school_admin") {
            return true; // Admin can import for any class
        }

        if (user.role === "class_teacher") {
            return user.advisoryClass === targetClass;
        }

        return false;
    };

    describe("school_admin role", () => {
        it("should allow import for any class", () => {
            const admin: User = {
                role: "school_admin",
                schoolId: "school1",
            };
            expect(canImportForClass(admin, "ม.1/1")).toBe(true);
            expect(canImportForClass(admin, "ม.2/5")).toBe(true);
            expect(canImportForClass(admin, "ม.6/10")).toBe(true);
        });
    });

    describe("class_teacher role", () => {
        it("should allow import only for advisory class", () => {
            const teacher: User = {
                role: "class_teacher",
                advisoryClass: "ม.2/5",
                schoolId: "school1",
            };
            expect(canImportForClass(teacher, "ม.2/5")).toBe(true);
        });

        it("should deny import for other classes", () => {
            const teacher: User = {
                role: "class_teacher",
                advisoryClass: "ม.2/5",
                schoolId: "school1",
            };
            expect(canImportForClass(teacher, "ม.1/1")).toBe(false);
            expect(canImportForClass(teacher, "ม.3/1")).toBe(false);
        });

        it("should deny if no advisory class", () => {
            const teacher: User = {
                role: "class_teacher",
                schoolId: "school1",
            };
            expect(canImportForClass(teacher, "ม.2/5")).toBe(false);
        });
    });
});

describe("Import Students - Incomplete Activity Warning Round Guard", () => {
    /**
     * Tests the logic for determining whether to show incomplete activity warnings.
     * Round 1 has no previous round, so warnings should be skipped entirely.
     * Round 2+ should check the previous round's activities.
     */
    interface IncompleteActivityInfo {
        hasIncomplete: boolean;
        studentCount: number;
        activityCount: number;
        previousRound: number;
    }

    const getNoWarning = (assessmentRound: number): IncompleteActivityInfo => ({
        hasIncomplete: false,
        studentCount: 0,
        activityCount: 0,
        previousRound: Math.max(assessmentRound - 1, 1),
    });

    /**
     * Simulates the early-return guard logic:
     * if (classes.length === 0 || assessmentRound <= 1) return noWarning;
     */
    const shouldSkipWarning = (
        classes: string[],
        assessmentRound: number,
    ): boolean => {
        return classes.length === 0 || assessmentRound <= 1;
    };

    const getPreviousRound = (assessmentRound: number): number => {
        return assessmentRound - 1;
    };

    it("should skip warning for round 1 (no previous round)", () => {
        expect(shouldSkipWarning(["ม.1/1"], 1)).toBe(true);
    });

    it("should skip warning for round 0 or negative", () => {
        expect(shouldSkipWarning(["ม.1/1"], 0)).toBe(true);
        expect(shouldSkipWarning(["ม.1/1"], -1)).toBe(true);
    });

    it("should not skip warning for round 2", () => {
        expect(shouldSkipWarning(["ม.1/1"], 2)).toBe(false);
    });

    it("should not skip warning for round 3+", () => {
        expect(shouldSkipWarning(["ม.1/1"], 3)).toBe(false);
    });

    it("should skip warning when classes array is empty", () => {
        expect(shouldSkipWarning([], 2)).toBe(true);
    });

    it("should calculate correct previous round for round 2", () => {
        expect(getPreviousRound(2)).toBe(1);
    });

    it("should calculate correct previous round for round 3", () => {
        expect(getPreviousRound(3)).toBe(2);
    });

    it("should return noWarning with previousRound clamped to 1 for round 1", () => {
        const noWarning = getNoWarning(1);
        expect(noWarning.hasIncomplete).toBe(false);
        expect(noWarning.previousRound).toBe(1);
    });

    it("should return noWarning with correct previousRound for round 2", () => {
        const noWarning = getNoWarning(2);
        expect(noWarning.previousRound).toBe(1);
    });
});
