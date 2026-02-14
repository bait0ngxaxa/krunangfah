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

    const handleYearChange = (yearId: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (yearId === "all") {
            params.delete("year");
        } else {
            params.set("year", yearId);
        }

        router.push(`?${params.toString()}`);
    };

    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-pink-200 ring-1 ring-pink-50 p-4 overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute -top-8 -right-8 w-20 h-20 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

            <div className="relative flex items-center gap-4">
                <label
                    htmlFor="year-filter"
                    className="text-sm font-semibold text-gray-700 whitespace-nowrap"
                >
                    <div className="relative inline-block mr-1.5">
                        <div className="absolute inset-0 rounded-full bg-pink-400 blur-md opacity-20" />
                        <CalendarDays className="relative w-4 h-4 text-pink-500" />
                    </div>
                    ปีการศึกษา:
                </label>
                <select
                    id="year-filter"
                    value={currentYearId || "all"}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="flex-1 px-4 py-2 border border-pink-100 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all outline-none"
                >
                    <option value="all">ทุกปีการศึกษา</option>
                    {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                            {year.year} เทอม {year.semester}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
