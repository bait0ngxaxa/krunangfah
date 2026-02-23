import { SlidersHorizontal, ArrowRightLeft } from "lucide-react";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";
import type { RiskLevel, GroupedStudents } from "../types";

interface StudentFilterBarProps {
    selectedRiskFilter: RiskLevel | "all";
    showReferredOnly: boolean;
    referredCount: number;
    groupedStudents: GroupedStudents;
    riskLevels: RiskLevel[];
    onRiskFilterChange: (level: RiskLevel | "all") => void;
    onReferredToggle: () => void;
}

function getRiskChipCount(
    groupedStudents: GroupedStudents,
    level: RiskLevel,
): number {
    switch (level) {
        case "red":
            return groupedStudents.red.length;
        case "orange":
            return groupedStudents.orange.length;
        case "yellow":
            return groupedStudents.yellow.length;
        case "green":
            return groupedStudents.green.length;
        case "blue":
            return groupedStudents.blue.length;
    }
}

function getRiskChipColors(level: RiskLevel): {
    active: string;
    inactive: string;
} {
    switch (level) {
        case "red":
            return {
                active: "bg-red-100 text-red-700 border-red-300 ring-1 ring-red-200",
                inactive:
                    "bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600",
            };
        case "orange":
            return {
                active: "bg-orange-100 text-orange-700 border-orange-300 ring-1 ring-orange-200",
                inactive:
                    "bg-white text-slate-600 border-slate-200 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600",
            };
        case "yellow":
            return {
                active: "bg-yellow-100 text-yellow-700 border-yellow-300 ring-1 ring-yellow-200",
                inactive:
                    "bg-white text-slate-600 border-slate-200 hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600",
            };
        case "green":
            return {
                active: "bg-emerald-100 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200",
                inactive:
                    "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600",
            };
        case "blue":
            return {
                active: "bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-200",
                inactive:
                    "bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600",
            };
    }
}

export function StudentFilterBar({
    selectedRiskFilter,
    showReferredOnly,
    referredCount,
    groupedStudents,
    riskLevels,
    onRiskFilterChange,
    onReferredToggle,
}: StudentFilterBarProps) {
    const isAllSelected =
        selectedRiskFilter === "all" && !showReferredOnly;

    return (
        <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/80 ring-1 ring-slate-900/5 overflow-hidden">
            {/* Top Edge Highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-300/30 to-transparent" />

            {/* Corner decoration */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-indigo-200/30 to-violet-300/20 rounded-full blur-2xl pointer-events-none opacity-50" />

            <div className="px-5 py-4 relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-linear-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 shadow-sm text-indigo-600">
                        <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <span className="text-[15px] font-extrabold text-slate-800 tracking-tight">
                        กรองระดับความเสี่ยง
                    </span>
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2">
                    {/* "ทั้งหมด" chip */}
                    <button
                        type="button"
                        onClick={() => onRiskFilterChange("all")}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 cursor-pointer shadow-xs ${
                            isAllSelected
                                ? "bg-slate-800 text-white border-slate-700 ring-1 ring-slate-600"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                        ทั้งหมด
                    </button>

                    {/* Risk level chips */}
                    {riskLevels.map((level) => {
                        const config = getRiskLevelConfig(level);
                        const colors = getRiskChipColors(level);
                        const count = getRiskChipCount(
                            groupedStudents,
                            level,
                        );
                        const isActive = selectedRiskFilter === level;

                        return (
                            <button
                                key={level}
                                type="button"
                                onClick={() => onRiskFilterChange(level)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 cursor-pointer shadow-xs ${
                                    isActive
                                        ? colors.active
                                        : colors.inactive
                                }`}
                            >
                                <span>{config.emoji}</span>
                                <span>{config.label}</span>
                                <span
                                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                        isActive
                                            ? "bg-white/50"
                                            : "bg-slate-100"
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}

                    {/* Divider */}
                    {referredCount > 0 && (
                        <div className="w-px h-6 bg-slate-200 self-center mx-0.5" />
                    )}

                    {/* "ส่งต่อมา" referral chip */}
                    {referredCount > 0 && (
                        <button
                            type="button"
                            onClick={onReferredToggle}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 cursor-pointer shadow-xs ${
                                showReferredOnly
                                    ? "bg-purple-100 text-purple-700 border-purple-300 ring-1 ring-purple-200"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600"
                            }`}
                        >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>ส่งต่อมา</span>
                            <span
                                className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    showReferredOnly
                                        ? "bg-white/50"
                                        : "bg-slate-100"
                                }`}
                            >
                                {referredCount}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
