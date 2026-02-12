"use client";

import { BarChart3 } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { GradeRiskData } from "@/lib/actions/analytics";

interface RiskLevelByGradeChartProps {
    gradeRiskData: GradeRiskData[];
}

// Risk level configuration for legend (ordered from lowest to highest severity)
const RISK_LEVELS = [
    { key: "blue", label: "สีฟ้า", color: "#60A5FA" },
    { key: "green", label: "สีเขียว", color: "#34D399" },
    { key: "yellow", label: "สีเหลือง", color: "#FBBF24" },
    { key: "orange", label: "สีส้ม", color: "#F97316" },
    { key: "red", label: "สีแดง", color: "#F43F5E" },
] as const;

// Custom legend component (declared outside to avoid re-creation during render)
function CustomLegend() {
    return (
        <div className="flex flex-wrap justify-center gap-3 pb-3">
            {RISK_LEVELS.map((level) => (
                <div
                    key={level.key}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                >
                    <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: level.color }}
                    />
                    <span className="text-gray-700">{level.label}</span>
                </div>
            ))}
        </div>
    );
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
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <span>ยังไม่มีข้อมูลการคัดกรอง</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-4 sm:mb-6 text-center">
                ข้อมูลนักเรียนแยกตามระดับชั้น
            </h2>
            <CustomLegend />
            <ResponsiveContainer width="100%" height={350}>
                <BarChart
                    data={gradeRiskData}
                    margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                    tabIndex={-1}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" />
                    <XAxis
                        dataKey="grade"
                        label={{
                            value: "ระดับชั้น",
                            position: "insideBottom",
                            offset: -5,
                            fill: "#9CA3AF",
                            fontSize: 12,
                        }}
                        tick={{ fill: "#6B7280", fontSize: 11 }}
                        axisLine={{ stroke: "#FBCFE8" }}
                    />
                    <YAxis
                        label={{
                            value: "จำนวนนักเรียน (คน)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#9CA3AF",
                            fontSize: 11,
                        }}
                        tick={{ fill: "#6B7280", fontSize: 11 }}
                        axisLine={{ stroke: "#FBCFE8" }}
                        width={50}
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
                    <Bar
                        dataKey="blue"
                        stackId="a"
                        fill="#60A5FA"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="green"
                        stackId="a"
                        fill="#34D399"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="yellow"
                        stackId="a"
                        fill="#FBBF24"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="orange"
                        stackId="a"
                        fill="#F97316"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="red"
                        stackId="a"
                        fill="#F43F5E"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
