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
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 border border-emerald-200 ring-1 ring-emerald-50 overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-emerald-200/40 to-green-300/30 rounded-full blur-xl pointer-events-none" />
            <div className="bg-linear-to-r from-emerald-400 via-green-400 to-emerald-500 px-5 py-3 flex items-center gap-2.5 relative">
                <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm shadow-inner ring-1 ring-white/20">
                    <Filter className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white tracking-wide">
                    เลือกห้องเรียน
                </span>
            </div>
            <div className="p-4 sm:p-5">
                <div className="relative w-full md:w-72">
                    <select
                        value={selectedClass}
                        onChange={(e) => onClassChange(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 pr-10 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none bg-white/70 backdrop-blur-sm transition-all text-sm font-medium text-gray-700"
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
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
