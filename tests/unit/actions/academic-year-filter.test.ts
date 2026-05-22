/**
 * Unit Tests: Academic Year Record Filter Builder
 *
 * Tests the buildAcademicYearRecordFilter logic used by both
 * counseling.actions.ts and home-visit.actions.ts to filter
 * records by academic year with legacy date-range fallback.
 */

import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
// Replicate pure logic from counseling.actions.ts / home-visit.actions.ts
// ═══════════════════════════════════════════════════════════

interface AcademicYearDateRange {
    startDate: Date;
    endDate: Date;
}

interface WhereInput {
    academicYearId?: string | null;
    sessionDate?: {
        gte: Date;
        lte: Date;
    };
    OR?: Array<{
        academicYearId?: string | null;
        sessionDate?: {
            gte: Date;
            lte: Date;
        };
    }>;
}

function buildAcademicYearRecordFilter(
    academicYearId?: string,
    dateRange?: AcademicYearDateRange,
): WhereInput {
    if (academicYearId && dateRange) {
        return {
            OR: [
                { academicYearId },
                {
                    academicYearId: null,
                    sessionDate: {
                        gte: dateRange.startDate,
                        lte: dateRange.endDate,
                    },
                },
            ],
        };
    }

    if (academicYearId) {
        return { academicYearId };
    }

    if (dateRange) {
        return {
            sessionDate: {
                gte: dateRange.startDate,
                lte: dateRange.endDate,
            },
        };
    }

    return {};
}

// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════

describe("buildAcademicYearRecordFilter", () => {
    const ACADEMIC_YEAR_ID = "cly123academicyear";
    const DATE_RANGE: AcademicYearDateRange = {
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-10-31"),
    };

    describe("both academicYearId and dateRange provided", () => {
        it("should return OR filter covering tagged and legacy records", () => {
            const result = buildAcademicYearRecordFilter(
                ACADEMIC_YEAR_ID,
                DATE_RANGE,
            );

            expect(result.OR).toBeDefined();
            expect(result.OR).toHaveLength(2);

            // First branch: tagged records
            expect(result.OR![0]).toEqual({
                academicYearId: ACADEMIC_YEAR_ID,
            });

            // Second branch: legacy records (no academicYearId) within date range
            expect(result.OR![1]).toEqual({
                academicYearId: null,
                sessionDate: {
                    gte: DATE_RANGE.startDate,
                    lte: DATE_RANGE.endDate,
                },
            });
        });

        it("should NOT have top-level academicYearId or sessionDate", () => {
            const result = buildAcademicYearRecordFilter(
                ACADEMIC_YEAR_ID,
                DATE_RANGE,
            );

            expect(result.academicYearId).toBeUndefined();
            expect(result.sessionDate).toBeUndefined();
        });
    });

    describe("only academicYearId provided", () => {
        it("should return direct academicYearId filter", () => {
            const result = buildAcademicYearRecordFilter(ACADEMIC_YEAR_ID);

            expect(result).toEqual({ academicYearId: ACADEMIC_YEAR_ID });
        });

        it("should NOT have OR clause", () => {
            const result = buildAcademicYearRecordFilter(ACADEMIC_YEAR_ID);

            expect(result.OR).toBeUndefined();
        });
    });

    describe("only dateRange provided", () => {
        it("should return date-range filter", () => {
            const result = buildAcademicYearRecordFilter(
                undefined,
                DATE_RANGE,
            );

            expect(result).toEqual({
                sessionDate: {
                    gte: DATE_RANGE.startDate,
                    lte: DATE_RANGE.endDate,
                },
            });
        });

        it("should NOT have academicYearId", () => {
            const result = buildAcademicYearRecordFilter(
                undefined,
                DATE_RANGE,
            );

            expect(result.academicYearId).toBeUndefined();
        });
    });

    describe("neither provided", () => {
        it("should return empty filter (no restrictions)", () => {
            const result = buildAcademicYearRecordFilter();

            expect(result).toEqual({});
        });

        it("should also return empty for explicit undefined", () => {
            const result = buildAcademicYearRecordFilter(undefined, undefined);

            expect(result).toEqual({});
        });
    });

    describe("edge cases", () => {
        it("should handle empty string academicYearId as falsy", () => {
            const result = buildAcademicYearRecordFilter("", DATE_RANGE);

            // Empty string is falsy → treated as "only dateRange"
            expect(result).toEqual({
                sessionDate: {
                    gte: DATE_RANGE.startDate,
                    lte: DATE_RANGE.endDate,
                },
            });
        });

        it("should preserve exact Date objects in date range", () => {
            const start = new Date("2026-01-01T00:00:00.000Z");
            const end = new Date("2026-12-31T23:59:59.999Z");
            const result = buildAcademicYearRecordFilter(ACADEMIC_YEAR_ID, {
                startDate: start,
                endDate: end,
            });

            const legacyBranch = result.OR![1];
            expect(legacyBranch.sessionDate!.gte).toBe(start);
            expect(legacyBranch.sessionDate!.lte).toBe(end);
        });
    });
});
