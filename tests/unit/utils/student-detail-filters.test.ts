import { describe, expect, it } from "vitest";
import {
    filterByAssessmentRoundSelection,
    filterByAcademicYearSelection,
    getUniqueAcademicYears,
    resolveAcademicTermScope,
    resolveAcademicYearDateRange,
    toCareRecordAcademicTermFilter,
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

describe("resolveAcademicTermScope", () => {
    const academicYears = [semesterOne, semesterTwo, olderSemester];

    it("keeps an unfiltered selection as all academic terms", () => {
        expect(resolveAcademicTermScope(academicYears)).toEqual({ kind: "all" });
    });

    it("resolves a whole academic year without selecting a single PHQ term", () => {
        expect(resolveAcademicTermScope(academicYears, "year:2568")).toEqual({
            kind: "year",
            year: 2568,
            dateRange: {
                startDate: new Date(2025, 4, 15, 0, 0, 0, 0),
                endDate: new Date(2026, 2, 31, 23, 59, 59, 999),
            },
        });
    });

    it("resolves one academic term directly from the selected filter", () => {
        expect(resolveAcademicTermScope(academicYears, "ay-2568-2")).toEqual({
            kind: "term",
            academicYearId: "ay-2568-2",
            year: 2568,
            semester: 2,
            dateRange: {
                startDate: new Date(2025, 10, 1, 0, 0, 0, 0),
                endDate: new Date(2026, 2, 31, 23, 59, 59, 999),
            },
        });
    });

    it("keeps an unknown URL value invalid instead of expanding it to all years", () => {
        expect(resolveAcademicTermScope(academicYears, "missing-semester")).toEqual({
            kind: "invalid",
            value: "missing-semester",
        });
        expect(resolveAcademicTermScope(academicYears, "year:invalid")).toEqual({
            kind: "invalid",
            value: "year:invalid",
        });
    });
});

describe("toCareRecordAcademicTermFilter", () => {
    const academicYears = [semesterOne, semesterTwo, olderSemester];

    it("does not constrain care records when every year is selected", () => {
        const scope = resolveAcademicTermScope(academicYears);
        expect(toCareRecordAcademicTermFilter(scope)).toEqual({});
    });

    it("uses the selected whole-year range without a PHQ-derived term id", () => {
        const scope = resolveAcademicTermScope(academicYears, "year:2568");
        expect(toCareRecordAcademicTermFilter(scope)).toEqual({
            dateRange: {
                startDate: new Date(2025, 4, 15, 0, 0, 0, 0),
                endDate: new Date(2026, 2, 31, 23, 59, 59, 999),
            },
        });
    });

    it("uses the directly selected term id and date range", () => {
        const scope = resolveAcademicTermScope(academicYears, "ay-2568-2");
        expect(toCareRecordAcademicTermFilter(scope)).toEqual({
            academicYearId: "ay-2568-2",
            dateRange: {
                startDate: new Date(2025, 10, 1, 0, 0, 0, 0),
                endDate: new Date(2026, 2, 31, 23, 59, 59, 999),
            },
        });
    });

    it("keeps invalid URLs constrained instead of treating them as all years", () => {
        const scope = resolveAcademicTermScope(
            academicYears,
            "missing-semester",
        );
        expect(toCareRecordAcademicTermFilter(scope)).toEqual({
            academicYearId: "missing-semester",
        });
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

    it("returns no items when the academic-term selection is invalid", () => {
        expect(
            filterByAcademicYearSelection(results, "year:invalid"),
        ).toEqual([]);
        expect(
            filterByAcademicYearSelection(results, "missing-semester"),
        ).toEqual([]);
    });
});

describe("filterByAssessmentRoundSelection", () => {
    const results = [
        { id: "phq-1", assessmentRound: 1 },
        { id: "phq-2", assessmentRound: 2 },
        { id: "phq-3", assessmentRound: 1 },
    ];

    it("filters results to the selected assessment round", () => {
        const result = filterByAssessmentRoundSelection(results, "2");

        expect(result.map((item) => item.id)).toEqual(["phq-2"]);
    });

    it("returns all results when no round is selected or the value is invalid", () => {
        expect(filterByAssessmentRoundSelection(results)).toEqual(results);
        expect(filterByAssessmentRoundSelection(results, "3")).toEqual(results);
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
