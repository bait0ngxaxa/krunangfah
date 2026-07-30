import { describe, expect, it } from "vitest";
import {
    buildImportedStudentsHref,
    type ImportCompletionContext,
} from "@/components/student/import/completion";

const baseContext: ImportCompletionContext = {
    academicYearId: "cm123456789012345678901234",
    academicYearLabel: "2569 เทอม 1",
    assessmentRound: 2,
    classNames: ["ม.1/1"],
};

describe("student import completion navigation", () => {
    it("keeps the imported class, academic year, and round", () => {
        expect(buildImportedStudentsHref(baseContext)).toBe(
            "/students?class=%E0%B8%A1.1%2F1&year=cm123456789012345678901234&round=2",
        );
    });

    it("does not hide other imported classes when a file contains multiple rooms", () => {
        expect(
            buildImportedStudentsHref({
                ...baseContext,
                classNames: ["ม.1/1", "ม.1/2"],
            }),
        ).toBe("/students?year=cm123456789012345678901234&round=2");
    });
});
