"use client";

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import type { RiskLevelSummary } from "@/lib/actions/analytics";

interface RiskLevelPieChartProps {
    riskLevelSummary: RiskLevelSummary[];
    totalStudents: number;
    selectedClass?: string;
}

interface ChartDataItem {
    name: string;
    value: number;
    color: string;
    percentage: number;
    riskLevel: string;
}

// Risk level order from lowest to highest severity
const RISK_LEVEL_ORDER = ["blue", "green", "yellow", "orange", "red"] as const;

// Custom legend component (declared outside to avoid re-creation during render)
function CustomLegend({ data }: { data: ChartDataItem[] }) {
    return (
        <div className="flex flex-wrap justify-center gap-3 pt-4">
            {data.map((item) => (
                <div
                    key={item.riskLevel}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                >
                    <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700">
                        {item.name}: {item.value} คน ({item.percentage.toFixed(0)}%)
                    </span>
                </div>
            ))}
        </div>
    );
}

export function RiskLevelPieChart({
    riskLevelSummary,
    totalStudents: _totalStudents,
    selectedClass,
}: RiskLevelPieChartProps) {
    // Filter out zero counts and prepare data
    const chartData: ChartDataItem[] = riskLevelSummary
        .filter((item) => item.count > 0)
        .map((item) => ({
            name: item.label,
            value: item.count,
            color: item.color,
            percentage: item.percentage,
            riskLevel: item.riskLevel,
        }))
        .sort((a, b) => {
            const indexA = RISK_LEVEL_ORDER.indexOf(
                a.riskLevel as (typeof RISK_LEVEL_ORDER)[number],
            );
            const indexB = RISK_LEVEL_ORDER.indexOf(
                b.riskLevel as (typeof RISK_LEVEL_ORDER)[number],
            );
            return indexA - indexB;
        });

    // Custom label to position percentage INSIDE the slice
    const RADIAN = Math.PI / 180;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderInsideLabel = (props: any) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        // Hide label if slice is too small (< 5%)
        if (percent < 0.05) return null;

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight="bold"
                style={{
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // Dynamic title based on selected class
    const chartTitle = selectedClass
        ? `ข้อมูลนักเรียน (ห้อง ${selectedClass})`
        : "ข้อมูลนักเรียน (ทั้งหมด)";

    if (chartData.length === 0) {
        return (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-8 flex flex-col items-center justify-center min-h-[400px]">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    {chartTitle}
                </h2>
                <div className="text-gray-400 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                        <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                        </svg>
                    </div>
                    <span>ยังไม่มีข้อมูลการคัดกรอง</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-4 sm:p-6 pb-6 sm:pb-8">
            <h2 className="text-lg sm:text-xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-4 sm:mb-6 text-center">
                {chartTitle}
            </h2>
            <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderInsideLabel}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry) => (
                            <Cell
                                key={`cell-${entry.riskLevel}`}
                                fill={entry.color}
                                stroke="white"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderRadius: "1rem",
                            border: "1px solid #FCE7F3",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            padding: "12px",
                        }}
                        itemStyle={{ color: "#4B5563", fontWeight: 500 }}
                        formatter={(value: unknown) => {
                            const numValue =
                                typeof value === "number" ? value : 0;
                            return [`${numValue} คน`, "จำนวน"];
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            <CustomLegend data={chartData} />
        </div>
    );
}
