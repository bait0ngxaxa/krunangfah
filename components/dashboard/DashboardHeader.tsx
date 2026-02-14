import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface StatItem {
    icon: LucideIcon;
    label: string;
    value: string;
    unit?: string;
    color?: string; // tailwind color prefix, e.g. "pink", "blue", "orange"
}

interface DashboardHeaderProps {
    teacherName: string;
    schoolName: string;
    subtitle?: string;
    extra?: ReactNode;
    stats?: StatItem[];
}

const COLOR_MAP: Record<string, { icon: string; border: string; bg: string }> =
    {
        pink: {
            icon: "text-rose-500",
            border: "border-pink-200",
            bg: "bg-pink-50/80",
        },
        blue: {
            icon: "text-blue-500",
            border: "border-blue-200",
            bg: "bg-blue-50/80",
        },
        orange: {
            icon: "text-orange-500",
            border: "border-orange-200",
            bg: "bg-orange-50/80",
        },
        purple: {
            icon: "text-purple-500",
            border: "border-purple-200",
            bg: "bg-purple-50/80",
        },
        green: {
            icon: "text-green-500",
            border: "border-green-200",
            bg: "bg-green-50/80",
        },
    };

export function DashboardHeader({
    teacherName,
    schoolName,
    subtitle,
    extra,
    stats,
}: DashboardHeaderProps) {
    return (
        <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(244,114,182,0.15)] border border-pink-200 ring-1 ring-white/80 p-6 sm:p-7 mb-4 overflow-hidden group">
            {/* Gradient accent bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-400 via-pink-400 to-rose-300 opacity-60" />
            {/* Top shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
            {/* Corner decoration */}
            <div className="absolute -top-14 -right-14 w-36 h-36 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />

            <div className="relative flex items-center gap-4">
                {/* Animated avatar */}
                <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                    <div className="relative w-14 h-14 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center text-2xl shadow-lg shadow-pink-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                        🧚‍♀️
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                        สวัสดี,{" "}
                        <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                            {teacherName}
                        </span>
                    </h1>
                    <p className="text-sm text-gray-500 truncate">
                        {schoolName}
                        {subtitle ? (
                            <>
                                {" · "}
                                <span className="font-medium">{subtitle}</span>
                            </>
                        ) : null}
                    </p>
                </div>

                {extra ? (
                    <div className="hidden sm:block shrink-0">{extra}</div>
                ) : null}
            </div>

            {/* Stats Row */}
            {stats && stats.length > 0 && (
                <>
                    <div className="relative mt-5 mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-pink-100/80" />
                        </div>
                    </div>
                    <div className="relative flex flex-wrap gap-2 sm:gap-3">
                        {stats.map((stat) => {
                            const colors =
                                COLOR_MAP[stat.color || "pink"] ||
                                COLOR_MAP.pink;
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={stat.label}
                                    className={`inline-flex items-center gap-2 px-3 py-2 ${colors.bg} rounded-xl border ${colors.border} shadow-sm`}
                                >
                                    <Icon
                                        className={`w-3.5 h-3.5 ${colors.icon} shrink-0`}
                                    />
                                    <span className="text-xs text-gray-500">
                                        {stat.label}
                                    </span>
                                    <span className="text-sm font-bold text-gray-800">
                                        {stat.value}
                                        {stat.unit && (
                                            <span className="text-xs font-medium text-gray-400 ml-0.5">
                                                {stat.unit}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
