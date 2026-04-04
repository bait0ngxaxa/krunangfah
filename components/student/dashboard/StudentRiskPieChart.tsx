"use client";

import dynamic from "next/dynamic";

import type { PieChartDataItem } from "./types";

const RiskPieChart = dynamic(
    () =>
        import("@/components/ui/RiskPieChart").then((mod) => ({
            default: mod.RiskPieChart,
        })),
    {
        ssr: false,
        loading: () => (
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/80 ring-1 ring-slate-900/5 p-6 overflow-hidden flex items-center justify-center min-h-[300px]">
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />
                <div className="animate-pulse text-slate-400 font-medium">
                    {"กำลังโหลดกราฟ…"}
                </div>
            </div>
        ),
    },
);

interface StudentRiskPieChartProps {
    data: PieChartDataItem[];
    totalStudents: number;
}

export function StudentRiskPieChart({
    data,
    totalStudents,
}: StudentRiskPieChartProps) {
    return (
        <RiskPieChart
            data={data}
            title={`สรุปภาพรวมนักเรียน (${totalStudents} คน)`}
            height={280}
            outerRadius={85}
        />
    );
}