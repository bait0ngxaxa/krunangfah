"use client";

import { Filter } from "lucide-react";

interface ClassFilterProps {
    availableClasses: string[];
    currentClass?: string;
    onClassChange: (classValue: string) => void;
}

export function ClassFilter({
    availableClasses,
    currentClass,
    onClassChange,
}: ClassFilterProps) {
    if (availableClasses.length === 0) {
        return null;
    }

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-4 flex items-center gap-4">
            <div className="p-2 bg-pink-50 rounded-lg text-pink-500">
                <Filter className="w-5 h-5" />
            </div>
            <div className="flex-1 flex items-center gap-3">
                <label
                    htmlFor="class-filter"
                    className="text-sm font-bold text-gray-700 whitespace-nowrap"
                >
                    เลือกห้องเรียน:
                </label>
                <select
                    id="class-filter"
                    value={currentClass || "all"}
                    onChange={(e) => onClassChange(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none bg-white hover:border-pink-300 text-gray-600 font-medium cursor-pointer"
                >
                    <option value="all">แสดงทั้งหมด</option>
                    {availableClasses.map((className) => (
                        <option key={className} value={className}>
                            {className}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
