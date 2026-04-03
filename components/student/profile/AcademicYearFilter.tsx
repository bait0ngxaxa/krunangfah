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
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm">
            <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-emerald-100/50 blur-2xl" />
            <div className="relative flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label
                    htmlFor="year-filter"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-gray-700"
                >
                    <CalendarDays className="h-4 w-4 text-emerald-600" />
                    ปีการศึกษา:
                </label>
                <select
                    id="year-filter"
                    value={currentYearId || "all"}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="w-full min-w-0 truncate rounded-xl border border-emerald-200 bg-white px-4 py-2.5 shadow-sm outline-none transition-all hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:flex-1"
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
