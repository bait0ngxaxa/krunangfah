import { describe, expect, it } from "vitest";
import {
    filterByAcademicYearSelection,
    getUniqueAcademicYears,
    resolveAcademicYearDateRange,
} from "@/lib/utils/student-detail-filters";

const semesterOne = {
    id: "ay-2568-1",
    year: 2568,
    semester: 1,
    startDate: new Date(2025, 4, 15),
    endDate: new Date(2025, 9, 15),
};

const semesterTwo = {
    id: "ay-2568-2",
    year: 2568,
    semester: 2,
    startDate: new Date(2025, 10, 1),
    endDate: new Date(2026, 2, 31),
};

const olderSemester = {
    id: "ay-2567-2",
    year: 2567,
    semester: 2,
    startDate: new Date(2024, 10, 1),
    endDate: new Date(2025, 2, 31),
};

describe("getUniqueAcademicYears", () => {
    it("returns unique academic years sorted from newest to oldest", () => {
        const result = getUniqueAcademicYears([
            olderSemester,
            semesterOne,
            semesterTwo,
            semesterOne,
        ]);

        expect(result).toEqual([semesterTwo, semesterOne, olderSemester]);
    });
});

describe("filterByAcademicYearSelection", () => {
    const results = [
        { id: "phq-1", academicYear: semesterOne },
        { id: "phq-2", academicYear: semesterTwo },
        { id: "phq-3", academicYear: olderSemester },
        { id: "phq-4", academicYear: null },
    ];

    it("returns all items when no year is selected", () => {
        expect(filterByAcademicYearSelection(results)).toEqual(results);
    });

    it("filters all semesters in the selected academic year", () => {
        const result = filterByAcademicYearSelection(results, "year:2568");

        expect(result.map((item) => item.id)).toEqual(["phq-1", "phq-2"]);
    });

    it("filters only the selected semester id", () => {
        const result = filterByAcademicYearSelection(results, "ay-2568-2");

        expect(result.map((item) => item.id)).toEqual(["phq-2"]);
    });

    it("falls back to all items when year format is invalid", () => {
        expect(filterByAcademicYearSelection(results, "year:invalid")).toEqual(
            results,
        );
    });
});

describe("resolveAcademicYearDateRange", () => {
    const academicYears = [semesterOne, semesterTwo, olderSemester];

    it("returns null when no selection is provided", () => {
        expect(resolveAcademicYearDateRange(academicYears)).toBeNull();
    });

    it("returns the full academic-year range for year filters", () => {
        const result = resolveAcademicYearDateRange(academicYears, "year:2568");

        expect(result).not.toBeNull();
        expect(result?.startDate).toEqual(new Date(2025, 4, 15, 0, 0, 0, 0));
        expect(result?.endDate).toEqual(
            new Date(2026, 2, 31, 23, 59, 59, 999),
        );
    });

    it("returns the exact semester range for semester filters", () => {
        const result = resolveAcademicYearDateRange(academicYears, "ay-2568-1");

        expect(result).toEqual({
            startDate: new Date(2025, 4, 15, 0, 0, 0, 0),
            endDate: new Date(2025, 9, 15, 23, 59, 59, 999),
        });
    });

    it("returns null when the selected semester is unknown", () => {
        expect(
            resolveAcademicYearDateRange(academicYears, "missing-semester"),
        ).toBeNull();
    });
});
