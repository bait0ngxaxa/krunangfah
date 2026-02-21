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
        <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(16,185,129,0.15)] border border-emerald-200 ring-1 ring-white/80 p-4 flex items-center gap-4 overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute -top-8 -right-8 w-20 h-20 bg-linear-to-br from-emerald-200/30 to-green-300/20 rounded-full blur-lg pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />

            <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-emerald-400 blur-md opacity-20" />
                <div className="relative p-2.5 bg-linear-to-br from-emerald-100 to-green-100 rounded-xl shadow-inner ring-1 ring-emerald-200/50 text-emerald-500">
                    <Filter className="w-5 h-5" />
                </div>
            </div>
            <div className="relative flex-1 flex items-center gap-3">
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
                    className="flex-1 px-4 py-2.5 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all outline-none bg-white/70 backdrop-blur-sm hover:border-emerald-300 text-gray-600 font-medium cursor-pointer"
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
