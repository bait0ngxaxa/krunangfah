"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";

interface AcademicYearFilterProps {
    availableYears: number[];
    selectedYear: string;
    onYearChange: (yearValue: string) => void;
}

const MAX_RECENT_YEARS = 3;

export function AcademicYearFilter({
    availableYears,
    selectedYear,
    onYearChange,
}: AcademicYearFilterProps) {
    const [showAllYears, setShowAllYears] = useState(false);

    if (availableYears.length <= 1) {
        return null;
    }

    const currentYear = getCurrentAcademicYear().year;

    // Sort descending (newest first)
    const sortedYears = [...availableYears].sort((a, b) => b - a);
    const hasOlderYears = sortedYears.length > MAX_RECENT_YEARS;
    const displayedYears = showAllYears
        ? sortedYears
        : sortedYears.slice(0, MAX_RECENT_YEARS);

    return (
        <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-4 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)]">
            <div className="pointer-events-none absolute -top-14 -right-14 h-32 w-32 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-cyan-200/25 blur-3xl" />

            <div className="relative z-10">
                <div className="rounded-2xl border border-white/80 bg-white/85 p-2.5 text-emerald-600 shadow-md ring-1 ring-slate-900/5">
                    <CalendarDays className="w-5 h-5" />
                </div>
            </div>
            <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label
                    htmlFor="year-filter-analytics"
                    className="text-sm font-bold whitespace-nowrap text-slate-700"
                >
                    ปีการศึกษา:
                </label>
                <select
                    id="year-filter-analytics"
                    value={selectedYear}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === "__show_all__") {
                            setShowAllYears(true);
                            return;
                        }
                        onYearChange(value);
                    }}
                    className="w-full min-w-0 cursor-pointer truncate rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 font-medium text-slate-600 outline-none transition-base hover:border-cyan-300 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200 sm:flex-1"
                >
                    <option value="all">ทุกปีการศึกษา</option>
                    {displayedYears.map((year) => (
                        <option key={year} value={String(year)}>
                            ปี {year}
                            {year === currentYear ? " (ปัจจุบัน)" : ""}
                        </option>
                    ))}
                    {hasOlderYears && !showAllYears && (
                        <option value="__show_all__">
                            ── ดูปีก่อนหน้านี้ (
                            {sortedYears.length - MAX_RECENT_YEARS} ปี) ──
                        </option>
                    )}
                </select>
            </div>
        </div>
    );
}
