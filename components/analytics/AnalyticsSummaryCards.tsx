"use client";

import { Users, CheckCircle, AlertCircle } from "lucide-react";

interface AnalyticsSummaryCardsProps {
    totalStudents: number;
    studentsWithAssessment: number;
    studentsWithoutAssessment: number;
    currentClass?: string;
}

function SummaryCard({
    icon,
    label,
    value,
    unit,

    bgColor,
    textColor,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    unit: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
    iconBgColor: string;
}) {
    return (
        <div
            className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300`}
        >
            <div
                className={`absolute top-0 right-0 w-24 h-24 ${bgColor} rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}
            />
            <div className="relative flex items-center gap-4">
                <div
                    className={`p-2.5 rounded-xl bg-rose-100 text-rose-500 group-hover:brightness-95 transition-colors`}
                >
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-4xl font-bold ${textColor}`}>
                            {value}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">
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
                icon={<Users className="w-8 h-8" />}
                label={`นักเรียนทั้งหมด${currentClass ? ` (${currentClass})` : ""}`}
                value={totalStudents}
                unit="คน"
                borderColor="border-blue-100"
                bgColor="bg-blue-50"
                textColor="text-blue-600"
                iconBgColor="bg-blue-50"
            />
            <SummaryCard
                icon={<CheckCircle className="w-8 h-8" />}
                label="คัดกรองแล้ว"
                value={studentsWithAssessment}
                unit="คน"
                borderColor="border-emerald-100"
                bgColor="bg-emerald-50"
                textColor="text-emerald-600"
                iconBgColor="bg-emerald-50"
            />
            <SummaryCard
                icon={<AlertCircle className="w-8 h-8" />}
                label="ยังไม่ได้คัดกรอง"
                value={studentsWithoutAssessment}
                unit="คน"
                borderColor="border-orange-100"
                bgColor="bg-orange-50"
                textColor="text-orange-600"
                iconBgColor="bg-orange-50"
            />
        </div>
    );
}
