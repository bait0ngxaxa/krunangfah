"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { ReactElement } from "react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";

interface AcademicYearFilterProps {
    availableYears: number[];
    selectedYear: string;
    onYearChange: (yearValue: string) => void;
    disabled?: boolean;
}

const MAX_RECENT_YEARS = 3;

/**
 * A year is always selected. There is no "all years" option: it could never be
 * applied (no year param means the current term), and across years it would
 * mix students' latest-ever results, graduated students and activities.
 */
export function resolveSelectedYear(selectedYear: string, currentYear: number): string {
    return /^\d{4}$/.test(selectedYear) ? selectedYear : String(currentYear);
}

export function AcademicYearFilter({ availableYears, selectedYear, onYearChange, disabled = false }: AcademicYearFilterProps): ReactElement {
    const [showAllYears, setShowAllYears] = useState(false);
    const currentYear = getCurrentAcademicYear().year;
    // Absent param (or an optimistic reset) means the current term's year.
    const value = resolveSelectedYear(selectedYear, currentYear);
    // Keep the selected year listed even when it has no screening data or is
    // older than the recent-years window, so the select is never blank.
    const sortedYears = Array.from(new Set([...availableYears, Number(value)])).sort((a, b) => b - a);
    const displayedYears = showAllYears
        ? sortedYears
        : sortedYears.filter((year, index) => index < MAX_RECENT_YEARS || String(year) === value);
    const hiddenYearCount = sortedYears.length - displayedYears.length;

    function handleChange(nextValue: string): void {
        if (nextValue === "__show_all__") { setShowAllYears(true); return; }
        onYearChange(nextValue);
    }

    return <FilterSelect icon={CalendarDays} label="ปีการศึกษา:" id="year-filter-analytics" value={value} onChange={handleChange} disabled={disabled}>
        {displayedYears.map((year) => <option key={year} value={String(year)}>ปี {year}{year === currentYear ? " (ปัจจุบัน)" : ""}</option>)}
        {hiddenYearCount > 0 && !showAllYears ? <option value="__show_all__">ดูปีก่อนหน้านี้ ({hiddenYearCount} ปี)</option> : null}
    </FilterSelect>;
}
