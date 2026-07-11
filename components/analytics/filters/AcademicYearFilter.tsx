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

export function AcademicYearFilter({ availableYears, selectedYear, onYearChange, disabled = false }: AcademicYearFilterProps): ReactElement | null {
    const [showAllYears, setShowAllYears] = useState(false);
    if (availableYears.length <= 1) return null;
    const currentYear = getCurrentAcademicYear().year;
    const sortedYears = [...availableYears].sort((a, b) => b - a);
    const displayedYears = showAllYears ? sortedYears : sortedYears.slice(0, MAX_RECENT_YEARS);

    function handleChange(value: string): void {
        if (value === "__show_all__") { setShowAllYears(true); return; }
        onYearChange(value);
    }

    return <FilterSelect icon={CalendarDays} label="ปีการศึกษา:" id="year-filter-analytics" value={selectedYear} onChange={handleChange} disabled={disabled}>
        <option value="all">ทุกปีการศึกษา</option>
        {displayedYears.map((year) => <option key={year} value={String(year)}>ปี {year}{year === currentYear ? " (ปัจจุบัน)" : ""}</option>)}
        {sortedYears.length > MAX_RECENT_YEARS && !showAllYears ? <option value="__show_all__">ดูปีก่อนหน้านี้ ({sortedYears.length - MAX_RECENT_YEARS} ปี)</option> : null}
    </FilterSelect>;
}
