import type { ReactNode } from "react";

interface DashboardHeaderProps {
    teacherName: string;
    schoolName: string;
    subtitle?: string;
    extra?: ReactNode;
}

export function DashboardHeader({
    teacherName,
    schoolName,
    subtitle,
    extra,
}: DashboardHeaderProps) {
    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-6 sm:p-7 mb-4 overflow-hidden group">
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
        </div>
    );
}
