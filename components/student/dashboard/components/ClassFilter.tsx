import { Filter, ChevronDown } from "lucide-react";

import type { ClassOption } from "../types";

interface ClassFilterProps {
    classOptions: ClassOption[];
    classes: string[];
    selectedClass: string;
    totalStudents: number;
    onClassChange: (className: string) => void;
}

export function ClassFilter({
    classOptions,
    classes,
    selectedClass,
    totalStudents,
    onClassChange,
}: ClassFilterProps) {
    if (classes.length <= 1) return null;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-slate-900/5 backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-teal-300/30 to-transparent" />

            <div className="relative z-10 flex flex-col justify-between gap-4 border-b border-slate-100/50 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl border border-teal-100 bg-linear-to-br from-teal-50 to-cyan-50 p-2.5 text-teal-600 shadow-sm">
                        <Filter className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="min-w-0 break-words text-[15px] font-extrabold tracking-tight text-slate-800">
                        {"กรองข้อมูลตามห้องเรียน"}
                    </span>
                </div>

                <div className="relative w-full sm:w-72">
                    <label htmlFor="student-class-filter" className="sr-only">
                        กรองข้อมูลตามห้องเรียน
                    </label>
                    <select
                        id="student-class-filter"
                        value={selectedClass}
                        onChange={(e) => onClassChange(e.target.value)}
                        className="min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-xs outline-none transition-base focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                    >
                        <option value="all">
                            {`ทุกห้อง (${totalStudents} คน)`}
                        </option>
                        {classOptions.map((classOption) => (
                            <option key={classOption.name} value={classOption.name}>
                                {`${classOption.name} (${classOption.count} คน)`}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
            </div>
        </div>
    );
}
