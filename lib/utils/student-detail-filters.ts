import { generateAcademicYearData } from "@/lib/utils/academic-year";

export interface AcademicYearFilterOption {
    id: string;
    year: number;
    semester: number;
    startDate: Date;
    endDate: Date;
}

interface ItemWithAcademicYear {
    academicYear?: Pick<AcademicYearFilterOption, "id" | "year"> | null;
}

export interface AcademicYearDateRange {
    startDate: Date;
    endDate: Date;
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

export function filterByAcademicYearSelection<T extends ItemWithAcademicYear>(
    items: readonly T[],
    selectedYearId?: string,
): T[] {
    if (!selectedYearId) return [...items];

    if (selectedYearId.startsWith("year:")) {
        const yearNum = Number.parseInt(selectedYearId.replace("year:", ""), 10);
        if (Number.isNaN(yearNum)) return [...items];
        return items.filter((item) => item.academicYear?.year === yearNum);
    }

    return items.filter((item) => item.academicYear?.id === selectedYearId);
}

export function resolveAcademicYearDateRange(
    academicYears: readonly AcademicYearFilterOption[],
    selectedYearId?: string,
): AcademicYearDateRange | null {
    if (!selectedYearId) {
        return null;
    }

    if (selectedYearId.startsWith("year:")) {
        const yearNum = Number.parseInt(selectedYearId.replace("year:", ""), 10);
        if (Number.isNaN(yearNum)) {
            return null;
        }

        const [firstSemester, secondSemester] = generateAcademicYearData(yearNum);
        return {
            startDate: toStartOfDay(firstSemester.startDate),
            endDate: toEndOfDay(secondSemester.endDate),
        };
    }

    const academicYear = academicYears.find((item) => item.id === selectedYearId);
    if (!academicYear) {
        return null;
    }

    return {
        startDate: toStartOfDay(academicYear.startDate),
        endDate: toEndOfDay(academicYear.endDate),
    };
}
