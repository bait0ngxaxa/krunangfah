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
        <div className="relative bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-4 overflow-hidden">
            <div className="relative flex items-center gap-4">
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
                    className="flex-1 px-4 py-2 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all outline-none"
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
