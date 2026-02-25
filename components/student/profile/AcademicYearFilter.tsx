"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";

interface AcademicYear {
    id: string;
    year: number;
    semester: number;
}

interface AcademicYearFilterProps {
    academicYears: AcademicYear[];
    currentYearId?: string;
}

const MAX_RECENT_YEARS = 3;

export function AcademicYearFilter({
    academicYears,
    currentYearId,
}: AcademicYearFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showAllYears, setShowAllYears] = useState(false);

    if (academicYears.length === 0) {
        return null;
    }

    const currentAcademicYear = getCurrentAcademicYear();

    // Extract unique years for year-level filter (sorted newest first)
    const uniqueYears = [...new Set(academicYears.map((y) => y.year))].sort(
        (a, b) => b - a,
    );

    const hasOlderYears = uniqueYears.length > MAX_RECENT_YEARS;
    const displayedYears = showAllYears
        ? uniqueYears
        : uniqueYears.slice(0, MAX_RECENT_YEARS);

    // Filter per-semester options to only displayed years
    const displayedAcademicYears = academicYears.filter((y) =>
        displayedYears.includes(y.year),
    );

    const handleYearChange = (value: string) => {
        if (value === "__show_all__") {
            setShowAllYears(true);
            return;
        }

        const params = new URLSearchParams(searchParams.toString());

        if (value === "all") {
            params.delete("year");
        } else {
            params.set("year", value);
        }

        router.push(`?${params.toString()}`);
    };

    const isCurrentSemester = (year: AcademicYear) =>
        year.year === currentAcademicYear.year &&
        year.semester === currentAcademicYear.semester;

    return (
        <div className="relative bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-4 overflow-hidden">
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                <label
                    htmlFor="year-filter"
                    className="text-sm font-semibold text-gray-700 whitespace-nowrap"
                >
                    <div className="relative inline-block mr-1.5">
                        <div className="absolute inset-0 rounded-full bg-emerald-400 blur-md opacity-20" />
                        <CalendarDays className="relative w-4 h-4 text-emerald-500" />
                    </div>
                    ปีการศึกษา:
                </label>
                <select
                    id="year-filter"
                    value={currentYearId || "all"}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="w-full sm:flex-1 min-w-0 px-4 py-2 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all outline-none truncate"
                >
                    <option value="all">ทุกปีการศึกษา</option>
                    {uniqueYears.length > 1 &&
                        displayedYears.map((year) => (
                            <option key={`year:${year}`} value={`year:${year}`}>
                                📅 ปี {year} (ทุกเทอม)
                                {year === currentAcademicYear.year
                                    ? " — ปัจจุบัน"
                                    : ""}
                            </option>
                        ))}
                    <optgroup label="แยกรายเทอม">
                        {displayedAcademicYears.map((year) => (
                            <option key={year.id} value={year.id}>
                                {year.year} เทอม {year.semester}
                                {isCurrentSemester(year) ? " (ปัจจุบัน)" : ""}
                            </option>
                        ))}
                    </optgroup>
                    {hasOlderYears && !showAllYears && (
                        <option value="__show_all__">
                            ── ดูปีก่อนหน้านี้ (
                            {uniqueYears.length - MAX_RECENT_YEARS} ปี) ──
                        </option>
                    )}
                </select>
            </div>
        </div>
    );
}
