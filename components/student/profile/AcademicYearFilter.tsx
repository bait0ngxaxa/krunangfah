"use client";

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
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4">
            <div className="flex items-center gap-4">
                <label
                    htmlFor="year-filter"
                    className="text-sm font-semibold text-gray-700 whitespace-nowrap"
                >
                    📅 ปีการศึกษา:
                </label>
                <select
                    id="year-filter"
                    value={currentYearId || "all"}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all outline-none"
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
