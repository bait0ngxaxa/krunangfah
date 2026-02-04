"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import type { GradeRiskData } from "@/lib/actions/analytics";

interface RiskLevelByGradeChartProps {
    gradeRiskData: GradeRiskData[];
}

export function RiskLevelByGradeChart({
    gradeRiskData,
}: RiskLevelByGradeChartProps) {
    if (gradeRiskData.length === 0) {
        return (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-8 flex flex-col items-center justify-center min-h-[400px]">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    ข้อมูลนักเรียนแยกตามระดับชั้น
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
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                    </div>
                    <span>ยังไม่มีข้อมูลการคัดกรอง</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-6">
            <h2 className="text-xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-6 text-center">
                ข้อมูลนักเรียนแยกตามระดับชั้น
            </h2>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={gradeRiskData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" />
                    <XAxis
                        dataKey="grade"
                        label={{
                            value: "ระดับชั้น",
                            position: "insideBottom",
                            offset: -5,
                            fill: "#9CA3AF",
                        }}
                        tick={{ fill: "#6B7280" }}
                        axisLine={{ stroke: "#FBCFE8" }}
                    />
                    <YAxis
                        label={{
                            value: "จำนวนนักเรียน (คน)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#9CA3AF",
                        }}
                        tick={{ fill: "#6B7280" }}
                        axisLine={{ stroke: "#FBCFE8" }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderRadius: "1rem",
                            border: "1px solid #FCE7F3",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            padding: "12px",
                        }}
                        cursor={{ fill: "rgba(252, 231, 243, 0.3)" }}
                        formatter={(value: unknown) => {
                            const numValue =
                                typeof value === "number" ? value : 0;
                            return [`${numValue} คน`, ""];
                        }}
                        labelFormatter={(label: unknown) => {
                            const strLabel =
                                typeof label === "string" ? label : "";
                            return `ระดับชั้น: ${strLabel}`;
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
                    <Bar
                        dataKey="red"
                        stackId="a"
                        fill="#F43F5E"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="orange"
                        stackId="a"
                        fill="#F97316"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="yellow"
                        stackId="a"
                        fill="#FBBF24"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="green"
                        stackId="a"
                        fill="#34D399"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="blue"
                        stackId="a"
                        fill="#60A5FA"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
