"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/Skeleton";
import type { PieChartDataItem } from "./types";

const RiskPieChart = dynamic(
    () =>
        import("@/components/ui/RiskPieChart").then((mod) => ({
            default: mod.RiskPieChart,
        })),
    {
        ssr: false,
        loading: () => (
            <div
                className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                role="status"
                aria-label="กำลังโหลดกราฟสรุปภาพรวมนักเรียน"
            >
                <Skeleton className="h-48 w-48 rounded-full" />
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
