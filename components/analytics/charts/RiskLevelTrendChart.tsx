"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import type { TrendDataPoint } from "@/lib/actions/analytics";

interface RiskLevelTrendChartProps {
    trendData: TrendDataPoint[];
}

export function RiskLevelTrendChart({ trendData }: RiskLevelTrendChartProps) {
    if (trendData.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    กราฟแนวโน้มระดับความเสี่ยง
                </h2>
                <div className="flex items-center justify-center h-96 text-gray-500">
                    ยังไม่มีข้อมูลการคัดกรอง
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                กราฟแนวโน้มระดับความเสี่ยง
            </h2>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                    data={trendData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="period"
                        label={{
                            value: "เทอม",
                            position: "insideBottom",
                            offset: -5,
                        }}
                    />
                    <YAxis
                        label={{
                            value: "จำนวนนักเรียน (คน)",
                            angle: -90,
                            position: "insideLeft",
                        }}
                    />
                    <Tooltip
                        formatter={(value: unknown) => {
                            const numValue =
                                typeof value === "number" ? value : 0;
                            return [`${numValue} คน`, ""];
                        }}
                        labelFormatter={(label: unknown) => {
                            const strLabel =
                                typeof label === "string" ? label : "";
                            return `เทอม: ${strLabel}`;
                        }}
                    />
                    <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(value: string) => {
                            const labels: Record<string, string> = {
                                red: "สีแดง",
                                orange: "สีส้ม",
                                yellow: "สีเหลือง",
                                green: "สีเขียว",
                                blue: "สีฟ้า",
                            };
                            return labels[value] || value;
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="red"
                        stroke="#EF4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="orange"
                        stroke="#F97316"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="yellow"
                        stroke="#FCD34D"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="green"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="blue"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
