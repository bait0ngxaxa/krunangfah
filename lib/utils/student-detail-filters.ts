import { generateAcademicYearData } from "@/lib/utils/academic-year";

export interface AcademicYearFilterOption {
    id: string;
    year: number;
    semester: number;
    startDate: Date;
    endDate: Date;
}

interface ItemWithAcademicYear {
    academicYear?: AcademicYearFilterOption | null;
}

interface ItemWithAssessmentRound {
    assessmentRound: number;
}

export interface AcademicYearDateRange {
    startDate: Date;
    endDate: Date;
}

export type AcademicTermScope =
    | { kind: "all" }
    | {
          kind: "year";
          year: number;
          dateRange: AcademicYearDateRange;
      }
    | {
          kind: "term";
          academicYearId: string;
          year: number;
          semester: number;
          dateRange: AcademicYearDateRange;
      }
    | { kind: "invalid"; value: string };

export interface CareRecordAcademicTermFilter {
    academicYearId?: string;
    dateRange?: AcademicYearDateRange;
}

function toStartOfDay(date: Date): Date {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
}

function toEndOfDay(date: Date): Date {
    const nextDate = new Date(date);
    nextDate.setHours(23, 59, 59, 999);
    return nextDate;
}

export function getUniqueAcademicYears<T extends AcademicYearFilterOption>(
    academicYears: readonly T[],
): T[] {
    return Array.from(
        new Map(academicYears.map((academicYear) => [academicYear.id, academicYear])).values(),
    ).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.semester - a.semester;
    });
}

export function resolveAcademicTermScope(
    academicYears: readonly AcademicYearFilterOption[],
    selectedYearId?: string,
): AcademicTermScope {
    if (!selectedYearId) return { kind: "all" };

    if (selectedYearId.startsWith("year:")) {
        const yearValue = selectedYearId.slice("year:".length);
        const year = Number(yearValue);
        const isKnownYear = academicYears.some((item) => item.year === year);
        if (
            !/^\d+$/.test(yearValue) ||
            !Number.isSafeInteger(year) ||
            !isKnownYear
        ) {
            return { kind: "invalid", value: selectedYearId };
        }

        const [firstSemester, secondSemester] = generateAcademicYearData(year);
        return {
            kind: "year",
            year,
            dateRange: {
                startDate: toStartOfDay(firstSemester.startDate),
                endDate: toEndOfDay(secondSemester.endDate),
            },
        };
    }

    const academicYear = academicYears.find((item) => item.id === selectedYearId);
    if (!academicYear) {
        return { kind: "invalid", value: selectedYearId };
    }

    return {
        kind: "term",
        academicYearId: academicYear.id,
        year: academicYear.year,
        semester: academicYear.semester,
        dateRange: {
            startDate: toStartOfDay(academicYear.startDate),
            endDate: toEndOfDay(academicYear.endDate),
        },
    };
}

export function toCareRecordAcademicTermFilter(
    scope: AcademicTermScope,
): CareRecordAcademicTermFilter {
    if (scope.kind === "year") {
        return { dateRange: scope.dateRange };
    }
    if (scope.kind === "term") {
        return {
            academicYearId: scope.academicYearId,
            dateRange: scope.dateRange,
        };
    }
    if (scope.kind === "invalid") {
        return { academicYearId: scope.value };
    }
    return {};
}

export function filterByAcademicTermScope<T extends ItemWithAcademicYear>(
    items: readonly T[],
    scope: AcademicTermScope,
): T[] {
    if (scope.kind === "all") return [...items];
    if (scope.kind === "invalid") return [];
    if (scope.kind === "year") {
        return items.filter((item) => item.academicYear?.year === scope.year);
    }
    return items.filter(
        (item) => item.academicYear?.id === scope.academicYearId,
    );
}

export function filterByAcademicYearSelection<T extends ItemWithAcademicYear>(
    items: readonly T[],
    selectedYearId?: string,
): T[] {
    const academicYears = items.flatMap((item) =>
        item.academicYear ? [item.academicYear] : [],
    );
    const scope = resolveAcademicTermScope(academicYears, selectedYearId);
    return filterByAcademicTermScope(items, scope);
}

export function filterByAssessmentRoundSelection<T extends ItemWithAssessmentRound>(
    items: readonly T[],
    selectedRound?: string,
): T[] {
    if (selectedRound !== "1" && selectedRound !== "2") {
        return [...items];
    }

    const assessmentRound = Number.parseInt(selectedRound, 10);
    return items.filter((item) => item.assessmentRound === assessmentRound);
}

export function resolveAcademicYearDateRange(
    academicYears: readonly AcademicYearFilterOption[],
    selectedYearId?: string,
): AcademicYearDateRange | null {
    const scope = resolveAcademicTermScope(academicYears, selectedYearId);
    if (scope.kind === "year" || scope.kind === "term") {
        return scope.dateRange;
    }
    return null;
}
