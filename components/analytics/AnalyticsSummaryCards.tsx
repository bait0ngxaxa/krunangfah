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
    bgColor,
    iconColor,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    unit: string;
    bgColor: string;
    iconColor: string;
}) {
    return (
        <div
            className={`relative ${bgColor} rounded-2xl shadow-sm border-2 border-transparent p-6 overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-[#0BD0D9]/20`}
        >
            <div className="relative flex items-center gap-5 z-10">
                <div className="relative shrink-0">
                    <div className="p-3.5 rounded-xl bg-white shadow-sm ring-1 ring-black/5 group-hover:scale-105 transition-transform duration-300">
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-500 tracking-wide mb-1 uppercase">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p
                            className={`text-3xl font-extrabold text-gray-900 tracking-tight`}
                        >
                            {value}
                        </p>
                        <p
                            className={`text-sm font-bold ${iconColor} opacity-80`}
                        >
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard
                icon={Users}
                label={`นักเรียนทั้งหมด${currentClass ? ` (${currentClass})` : ""}`}
                value={totalStudents}
                unit="คน"
                bgColor="bg-cyan-50/50"
                iconColor="text-[#09B8C0]"
            />
            <SummaryCard
                icon={CheckCircle}
                label="คัดกรองแล้ว"
                value={studentsWithAssessment}
                unit="คน"
                bgColor="bg-emerald-50/50"
                iconColor="text-[#059669]"
            />
            <SummaryCard
                icon={AlertCircle}
                label="ยังไม่ได้คัดกรอง"
                value={studentsWithoutAssessment}
                unit="คน"
                bgColor="bg-gray-50"
                iconColor="text-gray-500"
            />
        </div>
    );
}
