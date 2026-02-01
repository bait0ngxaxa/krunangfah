"use client";

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from "recharts";
import type { RiskLevelSummary } from "@/lib/actions/analytics.actions";

interface RiskLevelPieChartProps {
    riskLevelSummary: RiskLevelSummary[];
    totalStudents: number;
}

interface ChartDataItem {
    name: string;
    value: number;
    color: string;
    percentage: number;
}

export function RiskLevelPieChart({
    riskLevelSummary,
    totalStudents: _totalStudents,
}: RiskLevelPieChartProps) {
    // Filter out zero counts and prepare data
    const chartData: ChartDataItem[] = riskLevelSummary
        .filter((item) => item.count > 0)
        .map((item) => ({
            name: item.label,
            value: item.count,
            color: item.color,
            percentage: item.percentage,
        }));

    // Custom label to show percentage
    const renderLabel = (entry: unknown): string => {
        const labelEntry = entry as { percent?: number };
        const percent = ((labelEntry.percent || 0) * 100).toFixed(1);
        return `${percent}%`;
    };

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    ข้อมูลนักเรียน (ห้องที่ปรึกษา)
                </h2>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    ยังไม่มีข้อมูลการคัดกรอง
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 pb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                ข้อมูลนักเรียน (ห้องที่ปรึกษา)
            </h2>
            <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        labelLine={false}
                        label={renderLabel}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: unknown) => {
                            const numValue =
                                typeof value === "number" ? value : 0;
                            return [`${numValue} คน`, "จำนวน"];
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: string, entry: unknown) => {
                            const payload = entry as {
                                payload?: ChartDataItem;
                            };
                            const count = payload.payload?.value || 0;
                            const percent =
                                payload.payload?.percentage?.toFixed(1) || 0;
                            return `${value}: ${count} คน (${percent}%)`;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
