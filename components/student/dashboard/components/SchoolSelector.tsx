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
    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 border border-emerald-200 ring-1 ring-emerald-50 overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-emerald-200/40 to-green-300/30 rounded-full blur-xl pointer-events-none" />
            <div className="bg-linear-to-r from-emerald-500 via-green-500 to-emerald-600 px-5 py-3 flex items-center gap-2.5 relative">
                <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm shadow-inner ring-1 ring-white/20">
                    <School className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white tracking-wide">
                    เลือกโรงเรียน
                </span>
            </div>
            <div className="p-4 sm:p-5">
                <div className="relative w-full md:w-80">
                    <select
                        value={selectedSchoolId}
                        onChange={(e) => onSchoolChange(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 pr-10 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none bg-white/70 backdrop-blur-sm transition-all text-sm font-medium text-gray-700"
                    >
                        <option value="">-- เลือกโรงเรียน --</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                                {school.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
