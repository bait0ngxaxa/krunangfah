import { describe, expect, it } from "vitest";
import {
    buildImportStudentsPayload,
    buildZeroScoreWarning,
    createPreviewStudents,
    filterPreviewStudents,
    getAcademicYearLabel,
    getImportedClasses,
} from "@/components/student/import/ImportPreview/utils";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

function createStudent(
    overrides: Partial<ParsedStudent> = {},
): ParsedStudent {
    return {
        studentId: "S001",
        nationalId: "1234567890123",
        firstName: "สมชาย",
        lastName: "ใจดี",
        gender: "MALE",
        age: 13,
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
            q9a: false,
            q9b: false,
        },
        ...overrides,
    };
}

describe("ImportPreview utils", () => {
    it("creates preview students with calculated risk level", () => {
        const students = createPreviewStudents([
            createStudent({ scores: { ...createStudent().scores, q1: 3, q2: 2 } }),
        ]);

        expect(students).toHaveLength(1);
        expect(students[0].totalScore).toBe(5);
        expect(students[0].riskLevel).toBe("green");
        expect(students[0]._originalIndex).toBe(0);
    });

    it("filters invalid classes and counts only importable students", () => {
        const students = createPreviewStudents([
            createStudent({ studentId: "S001", class: "ม.1/1" }),
            createStudent({ studentId: "S002", class: "ม.9/9" }),
        ]);

        const result = filterPreviewStudents({
            students,
            schoolClassNames: ["ม.1/1"],
            teacherProfile: null,
        });

        expect(result.previewData.map((student) => student.studentId)).toEqual([
            "S001",
        ]);
        expect(
            result.filteredOutStudents.map((student) => student.studentId),
        ).toEqual(["S002"]);
        expect(result.riskCounts.blue).toBe(1);
    });

    it("limits class_teacher imports to advisory class", () => {
        const students = createPreviewStudents([
            createStudent({ studentId: "S001", class: "ม.1/1" }),
            createStudent({ studentId: "S002", class: "ม.1/2" }),
        ]);

        const result = filterPreviewStudents({
            students,
            schoolClassNames: ["ม.1/1", "ม.1/2"],
            teacherProfile: {
                role: "class_teacher",
                advisoryClass: "ม.1/2",
            },
        });

        expect(result.previewData.map((student) => student.studentId)).toEqual([
            "S002",
        ]);
    });

    it("builds zero-score warning examples without changing payload shape", () => {
        const students = createPreviewStudents([
            createStudent({ studentId: "S001" }),
            createStudent({
                studentId: "S002",
                scores: { ...createStudent().scores, q1: 1 },
            }),
        ]);

        const warning = buildZeroScoreWarning(students);
        const payload = buildImportStudentsPayload(students);

        expect(warning?.studentCount).toBe(1);
        expect(warning?.examples[0]).toMatchObject({
            studentId: "S001",
            fullName: "สมชาย ใจดี",
        });
        expect(payload[0]).not.toHaveProperty("_originalIndex");
        expect(payload[0]).not.toHaveProperty("riskLevel");
    });

    it("returns imported classes and academic year label", () => {
        const students = createPreviewStudents([
            createStudent({ class: "ม.1/1" }),
            createStudent({ studentId: "S002", class: "ม.1/1" }),
            createStudent({ studentId: "S003", class: "ม.1/2" }),
        ]);

        expect(getImportedClasses(students)).toEqual(["ม.1/1", "ม.1/2"]);
        expect(
            getAcademicYearLabel(
                [{ id: "year-1", year: 2569, semester: 1 }],
                "year-1",
            ),
        ).toBe("2569 เทอม 1");
    });
});
