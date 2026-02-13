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
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-4">
            <div className="flex items-center gap-4">
                <label
                    htmlFor="year-filter"
                    className="text-sm font-semibold text-gray-700 whitespace-nowrap"
                >
                    <CalendarDays className="w-4 h-4 text-gray-500 inline-block mr-1" /> ปีการศึกษา:
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
