import { School, ChevronDown } from "lucide-react";
import type { SchoolOption } from "../types";

interface SchoolSelectorProps {
    schools: SchoolOption[];
    selectedSchoolId: string;
    onSchoolChange: (schoolId: string) => void;
}

export function SchoolSelector({
    schools,
    selectedSchoolId,
    onSchoolChange,
}: SchoolSelectorProps) {
    const hasSchools = schools.length > 0;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="relative flex items-center gap-2.5 bg-linear-to-r from-emerald-500 via-green-500 to-emerald-600 px-5 py-3">
                <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
                <div className="rounded-lg border border-emerald-200 bg-white p-1.5 shadow-inner ring-1 ring-white/20">
                    <School
                        className="h-4 w-4 text-emerald-600"
                        aria-hidden="true"
                    />
                </div>
                <span className="break-words text-sm font-bold tracking-wide text-white">
                    {"เลือกโรงเรียน"}
                </span>
            </div>
            <div className="p-4 sm:p-5">
                <div className="relative w-full md:w-80">
                    <label htmlFor="student-school-filter" className="sr-only">
                        เลือกโรงเรียน
                    </label>
                    <select
                        id="student-school-filter"
                        value={selectedSchoolId}
                        onChange={(e) => onSchoolChange(e.target.value)}
                        disabled={!hasSchools}
                        className="min-h-11 w-full appearance-none rounded-xl border border-emerald-100 bg-white/70 px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 outline-none transition-base focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                    >
                        <option value="">
                            {hasSchools
                                ? "-- เลือกโรงเรียน --"
                                : "ยังไม่มีโรงเรียนในระบบ"}
                        </option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                                {school.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
            </div>
        </div>
    );
}
