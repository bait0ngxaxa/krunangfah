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
    red: "นักเรียนสีแดง",
    orange: "นักเรียนสีส้ม",
    yellow: "นักเรียนสีเหลือง",
    green: "นักเรียนสีเขียว",
    blue: "นักเรียนสีฟ้า",
};

export function RiskPieChart({ data }: RiskPieChartProps) {
    const total = data.red + data.orange + data.yellow + data.green + data.blue;

    const chartData = [
        {
            name: LABELS.red,
            value: data.red,
            color: COLORS.red,
            level: "red" as RiskLevel,
        },
        {
            name: LABELS.orange,
            value: data.orange,
            color: COLORS.orange,
            level: "orange" as RiskLevel,
        },
        {
            name: LABELS.yellow,
            value: data.yellow,
            color: COLORS.yellow,
            level: "yellow" as RiskLevel,
        },
        {
            name: LABELS.green,
            value: data.green,
            color: COLORS.green,
            level: "green" as RiskLevel,
        },
        {
            name: LABELS.blue,
            value: data.blue,
            color: COLORS.blue,
            level: "blue" as RiskLevel,
        },
    ].filter((item) => item.value > 0);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
                <p className="text-gray-500">ไม่มีข้อมูลนักเรียน</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 border-4 border-purple-400">
            <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
                สรุปภาพรวมนักเรียน ({total} คน)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} คน`, "จำนวน"]} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
