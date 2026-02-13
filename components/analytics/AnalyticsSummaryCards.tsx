"use client";

import { Users, CheckCircle, AlertCircle, type LucideIcon } from "lucide-react";

interface AnalyticsSummaryCardsProps {
    totalStudents: number;
    studentsWithAssessment: number;
    studentsWithoutAssessment: number;
    currentClass?: string;
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    unit,
    accentFrom,
    accentTo,
    valueColor,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    unit: string;
    accentFrom: string;
    accentTo: string;
    valueColor: string;
}) {
    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-5 overflow-hidden group hover:shadow-xl hover:shadow-pink-200/40 hover:-translate-y-1 hover:ring-pink-100 transition-all duration-300 cursor-default">
            {/* Decorative gradient corner */}
            <div
                className={`absolute -top-8 -right-8 w-20 h-20 bg-linear-to-br ${accentFrom} ${accentTo} rounded-full blur-lg group-hover:scale-150 transition-transform duration-500 pointer-events-none`}
            />
            {/* Shimmer line */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative flex items-center gap-4">
                <div className="relative shrink-0">
                    <div
                        className={`absolute inset-0 rounded-xl blur-md opacity-25 bg-linear-to-br ${accentFrom} ${accentTo}`}
                    />
                    <div className="relative p-2.5 rounded-xl bg-linear-to-br from-rose-100 to-pink-100 shadow-inner ring-1 ring-rose-200/50 group-hover:from-rose-200 group-hover:to-pink-200 transition-colors duration-300">
                        <Icon className="w-6 h-6 text-rose-500 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-500 tracking-wide mb-1">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p
                            className={`text-3xl font-bold ${valueColor} group-hover:opacity-90 transition-opacity`}
                        >
                            {value}
                        </p>
                        <p className="text-sm text-gray-400 font-medium group-hover:text-pink-400 transition-colors duration-300">
                            {unit}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AnalyticsSummaryCards({
    totalStudents,
    studentsWithAssessment,
    studentsWithoutAssessment,
    currentClass,
}: AnalyticsSummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
                icon={Users}
                label={`นักเรียนทั้งหมด${currentClass ? ` (${currentClass})` : ""}`}
                value={totalStudents}
                unit="คน"
                accentFrom="from-blue-200/40"
                accentTo="to-blue-300/30"
                valueColor="text-blue-600"
            />
            <SummaryCard
                icon={CheckCircle}
                label="คัดกรองแล้ว"
                value={studentsWithAssessment}
                unit="คน"
                accentFrom="from-emerald-200/40"
                accentTo="to-emerald-300/30"
                valueColor="text-emerald-600"
            />
            <SummaryCard
                icon={AlertCircle}
                label="ยังไม่ได้คัดกรอง"
                value={studentsWithoutAssessment}
                unit="คน"
                accentFrom="from-orange-200/40"
                accentTo="to-orange-300/30"
                valueColor="text-orange-600"
            />
        </div>
    );
}
