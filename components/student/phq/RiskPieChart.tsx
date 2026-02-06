"use client";

/**
 * Risk Pie Chart Component
 * แสดงกราฟวงกลมสรุปนักเรียนตามระดับความเสี่ยง
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

interface RiskPieChartProps {
    data: {
        red: number;
        orange: number;
        yellow: number;
        green: number;
        blue: number;
    };
}

const COLORS: Record<RiskLevel, string> = {
    red: "#EF4444",
    orange: "#F97316",
    yellow: "#EAB308",
    green: "#22C55E",
    blue: "#3B82F6",
};

const LABELS: Record<RiskLevel, string> = {
    red: "สีแดง",
    orange: "สีส้ม",
    yellow: "สีเหลือง",
    green: "สีเขียว",
    blue: "สีฟ้า",
};

interface ChartDataItem {
    name: string;
    value: number;
    color: string;
    level: RiskLevel;
}

// Custom legend component (declared outside to avoid re-creation during render)
function CustomLegend({ data }: { data: ChartDataItem[] }) {
    return (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-2">
            {data.map((item) => (
                <div
                    key={item.level}
                    className="flex items-center gap-1.5 text-xs sm:text-sm"
                >
                    <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700">
                        {item.name}: {item.value} คน
                    </span>
                </div>
            ))}
        </div>
    );
}

export function RiskPieChart({ data }: RiskPieChartProps) {
    const total = data.red + data.orange + data.yellow + data.green + data.blue;

    // Order from lowest to highest severity: blue → green → yellow → orange → red
    const chartData: ChartDataItem[] = [
        {
            name: LABELS.blue,
            value: data.blue,
            color: COLORS.blue,
            level: "blue" as RiskLevel,
        },
        {
            name: LABELS.green,
            value: data.green,
            color: COLORS.green,
            level: "green" as RiskLevel,
        },
        {
            name: LABELS.yellow,
            value: data.yellow,
            color: COLORS.yellow,
            level: "yellow" as RiskLevel,
        },
        {
            name: LABELS.orange,
            value: data.orange,
            color: COLORS.orange,
            level: "orange" as RiskLevel,
        },
        {
            name: LABELS.red,
            value: data.red,
            color: COLORS.red,
            level: "red" as RiskLevel,
        },
    ].filter((item) => item.value > 0);

    // Custom label inside the slice
    const RADIAN = Math.PI / 180;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderInsideLabel = (props: any) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null;

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight="bold"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-2xl border border-pink-100">
                <p className="text-gray-500 font-medium">ไม่มีข้อมูลนักเรียน</p>
            </div>
        );
    }

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/50 p-4 sm:p-6 border border-white/60 relative overflow-hidden ring-1 ring-pink-50">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 text-center mb-4 flex items-center justify-center gap-2">
                <span className="text-xl">📊</span>
                สรุปภาพรวมนักเรียน ({total} คน)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        labelLine={false}
                        label={renderInsideLabel}
                        outerRadius={85}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry) => (
                            <Cell
                                key={`cell-${entry.level}`}
                                fill={entry.color}
                                stroke="#fff"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => [`${value} คน`, "จำนวน"]}
                        contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            borderRadius: "12px",
                            border: "1px solid #fce7f3",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            <CustomLegend data={chartData} />
        </div>
    );
}
