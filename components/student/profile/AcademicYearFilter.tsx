"use client";

import { CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface AcademicYear {
    id: string;
    year: number;
    semester: number;
}

interface AcademicYearFilterProps {
    academicYears: AcademicYear[];
    currentYearId?: string;
}

export function AcademicYearFilter({
    academicYears,
    currentYearId,
}: AcademicYearFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    if (academicYears.length === 0) {
        return null;
    }

    // Extract unique years for year-level filter
    const uniqueYears = [...new Set(academicYears.map((y) => y.year))].sort(
        (a, b) => b - a,
    );

    const handleYearChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value === "all") {
            params.delete("year");
        } else {
            params.set("year", value);
        }

        router.push(`?${params.toString()}`);
    };

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
                        uniqueYears.map((year) => (
                            <option key={`year:${year}`} value={`year:${year}`}>
                                📅 ปี {year} (ทุกเทอม)
                            </option>
                        ))}
                    <optgroup label="แยกรายเทอม">
                        {academicYears.map((year) => (
                            <option key={year.id} value={year.id}>
                                {year.year} เทอม {year.semester}
                            </option>
                        ))}
                    </optgroup>
                </select>
            </div>
        </div>
    );
}
