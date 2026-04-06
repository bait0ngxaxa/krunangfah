import { describe, expect, it } from "vitest";
import {
    studentHelpAssessmentRoute,
    studentHelpConversationRoute,
    studentHelpEncouragementRoute,
    studentHelpGuidelinesRoute,
    studentHelpRoute,
    studentHelpStartRoute,
    studentRoute,
} from "@/lib/constants/student-routes";

describe("student-routes", () => {
    const studentId = "std_123";

    it("should build base student routes", () => {
        expect(studentRoute(studentId)).toBe("/students/std_123");
        expect(studentHelpRoute(studentId)).toBe("/students/std_123/help");
        expect(studentHelpConversationRoute(studentId)).toBe(
            "/students/std_123/help/conversation",
        );
    });

    it("should build optional query routes only when values exist", () => {
        expect(studentHelpGuidelinesRoute(studentId)).toBe(
            "/students/std_123/help/guidelines",
        );
        expect(studentHelpGuidelinesRoute(studentId, "phq_1")).toBe(
            "/students/std_123/help/guidelines?phqResultId=phq_1",
        );
        expect(studentHelpStartRoute(studentId)).toBe(
            "/students/std_123/help/start",
        );
        expect(studentHelpStartRoute(studentId, "phq_2")).toBe(
            "/students/std_123/help/start?phqResultId=phq_2",
        );
    });

    it("should build assessment and encouragement routes with ordered query", () => {
        expect(studentHelpAssessmentRoute(studentId, 3)).toBe(
            "/students/std_123/help/start/assessment?activity=3",
        );
        expect(studentHelpAssessmentRoute(studentId, 3, "phq_3")).toBe(
            "/students/std_123/help/start/assessment?activity=3&phqResultId=phq_3",
        );

        expect(studentHelpEncouragementRoute(studentId, 2)).toBe(
            "/students/std_123/help/start/encouragement?activity=2",
        );
        expect(
            studentHelpEncouragementRoute(studentId, 2, {
                type: "external",
                phqResultId: "phq_4",
            }),
        ).toBe(
            "/students/std_123/help/start/encouragement?activity=2&phqResultId=phq_4&type=external",
        );
    });
});

