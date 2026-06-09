import { SlidersHorizontal, ArrowRightLeft } from "lucide-react";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";
import type {
    DashboardRiskFilter,
    RiskLevel,
    StudentGroupCounts,
} from "../types";

interface StudentFilterBarProps {
    selectedRiskFilter: DashboardRiskFilter;
    showReferredOnly: boolean;
    referredCount: number;
    groupedStudentCounts: StudentGroupCounts;
    riskLevels: readonly RiskLevel[];
    onRiskFilterChange: (level: DashboardRiskFilter) => void;
    onReferredToggle: () => void;
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

function getGroupedStudentCount(
    groupedStudentCounts: StudentGroupCounts,
    level: RiskLevel,
): number {
    switch (level) {
        case "red":
            return groupedStudentCounts.red;
        case "orange":
            return groupedStudentCounts.orange;
        case "yellow":
            return groupedStudentCounts.yellow;
        case "green":
            return groupedStudentCounts.green;
        case "blue":
            return groupedStudentCounts.blue;
    }
}

function formatCount(count: number): string {
    if (!Number.isFinite(count) || count < 0) {
        return "0";
    }

    return count.toLocaleString("th-TH");
}

export function StudentFilterBar({
    selectedRiskFilter,
    showReferredOnly,
    referredCount,
    groupedStudentCounts,
    riskLevels,
    onRiskFilterChange,
    onReferredToggle,
}: StudentFilterBarProps) {
    const isAllSelected =
        selectedRiskFilter === "all" && !showReferredOnly;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-slate-900/5 backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-300/30 to-transparent" />

            <div className="px-5 py-4 relative z-10">
                <div className="mb-3 flex min-w-0 items-center gap-3">
                    <div className="rounded-xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-violet-50 p-2 text-indigo-600 shadow-sm">
                        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="min-w-0 break-words text-[15px] font-extrabold tracking-tight text-slate-800">
                        กรองระดับความเสี่ยง
                    </span>
                </div>

                <div className="flex flex-wrap gap-2" role="group" aria-label="กรองระดับความเสี่ยง">
                    <button
                        type="button"
                        onClick={() => onRiskFilterChange("all")}
                        aria-pressed={isAllSelected}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-xs transition-base duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 ${
                            isAllSelected
                                ? "bg-slate-800 text-white border-slate-700 ring-1 ring-slate-600"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                        ทั้งหมด
                    </button>

                    {riskLevels.map((level) => {
                        const config = getRiskLevelConfig(level);
                        const colors = getRiskChipColors(level);
                        const count = getGroupedStudentCount(
                            groupedStudentCounts,
                            level,
                        );
                        const isActive = selectedRiskFilter === level;

                        return (
                            <button
                                key={level}
                                type="button"
                                onClick={() => onRiskFilterChange(level)}
                                aria-pressed={isActive}
                                className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-xs transition-base duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 ${
                                    isActive ? colors.active : colors.inactive
                                }`}
                            >
                                <span aria-hidden="true">{config.emoji}</span>
                                <span className="min-w-0 break-words">{config.label}</span>
                                <span
                                    className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                                        isActive ? "bg-white/50" : "bg-slate-100"
                                    }`}
                                >
                                    {formatCount(count)}
                                </span>
                            </button>
                        );
                    })}

                    {referredCount > 0 ? (
                        <div className="mx-0.5 hidden h-6 w-px self-center bg-slate-200 sm:block" />
                    ) : null}

                    {referredCount > 0 ? (
                        <button
                            type="button"
                            onClick={onReferredToggle}
                            aria-pressed={showReferredOnly}
                            className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-xs transition-base duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 ${
                                showReferredOnly
                                    ? "bg-purple-100 text-purple-700 border-purple-300 ring-1 ring-purple-200"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600"
                            }`}
                        >
                            <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 break-words">มีการส่งต่อ</span>
                            <span
                                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                                    showReferredOnly
                                        ? "bg-white/50"
                                        : "bg-slate-100"
                                }`}
                            >
                                {formatCount(referredCount)}
                            </span>
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
