import { Filter, ChevronDown } from "lucide-react";
import type { Student } from "../types";

interface ClassFilterProps {
    classes: string[];
    selectedClass: string;
    onClassChange: (className: string) => void;
    schoolFilteredStudents: Student[];
}

export function ClassFilter({
    classes,
    selectedClass,
    onClassChange,
    schoolFilteredStudents,
}: ClassFilterProps) {
    if (classes.length <= 1) return null;

    return (
        <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/80 ring-1 ring-slate-900/5 overflow-hidden">
            {/* Subtle Top Edge Highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-teal-300/30 to-transparent" />

            {/* Corner decoration */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-teal-200/30 to-cyan-300/20 rounded-full blur-2xl pointer-events-none opacity-50" />

            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-100/50">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-linear-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100 shadow-sm text-teal-600">
                        <Filter className="w-4 h-4" />
                    </div>
                    <span className="text-[15px] font-extrabold text-slate-800 tracking-tight">
                        กรองข้อมูลตามห้องเรียน
                    </span>
                </div>

                <div className="relative w-full sm:w-72">
                    <select
                        value={selectedClass}
                        onChange={(e) => onClassChange(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-300 outline-none bg-white transition-all text-sm font-semibold text-slate-700 shadow-xs cursor-pointer truncate"
                    >
                        <option value="all">
                            ทุกห้อง ({schoolFilteredStudents.length} คน)
                        </option>
                        {classes.map((cls) => {
                            const count = schoolFilteredStudents.filter(
                                (s) => s.class === cls,
                            ).length;
                            return (
                                <option key={cls} value={cls}>
                                    {cls} ({count} คน)
                                </option>
                            );
                        })}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
