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
import { RISK_CHART_CONFIG } from "@/lib/constants/risk-levels";

interface RiskLevelByGradeChartProps {
    gradeRiskData: GradeRiskData[];
}

// Custom legend component (declared outside to avoid re-creation during render)
function CustomLegend() {
    return (
        <div className="flex flex-wrap justify-center gap-3 pb-3">
            {RISK_CHART_CONFIG.map((level) => (
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
            <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(16,185,129,0.15)] border border-emerald-200 ring-1 ring-white/80 p-8 flex flex-col items-center justify-center min-h-[400px] overflow-hidden">
                {/* Decorations */}
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-emerald-200/40 to-green-300/30 rounded-full blur-xl pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />

                <h2 className="relative text-xl font-bold text-gray-800 mb-4 text-center">
                    ข้อมูลนักเรียนแยกตามระดับชั้น
                </h2>
                <div className="relative text-gray-400 flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full bg-emerald-300 blur-lg opacity-20" />
                        <div className="relative w-full h-full bg-gray-50 rounded-full flex items-center justify-center ring-1 ring-gray-100">
                            <BarChart3 className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                    <span>ยังไม่มีข้อมูลการคัดกรอง</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(16,185,129,0.15)] border border-emerald-200 ring-1 ring-white/80 p-4 sm:p-6 overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-emerald-200/40 to-green-300/30 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />

            <h2 className="relative text-lg sm:text-xl font-bold bg-linear-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-4 sm:mb-6 text-center">
                ข้อมูลนักเรียนแยกตามระดับชั้น
            </h2>
            <CustomLegend />
            <ResponsiveContainer width="100%" height={350}>
                <BarChart
                    data={gradeRiskData}
                    margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                    tabIndex={-1}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#D1FAE5" />
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
                        axisLine={{ stroke: "#A7F3D0" }}
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
                        axisLine={{ stroke: "#A7F3D0" }}
                        width={50}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderRadius: "1rem",
                            border: "1px solid #D1FAE5",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            padding: "12px",
                        }}
                        cursor={{ fill: "rgba(209, 250, 229, 0.3)" }}
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
                        fill={RISK_CHART_CONFIG[0].color}
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="green"
                        stackId="a"
                        fill={RISK_CHART_CONFIG[1].color}
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="yellow"
                        stackId="a"
                        fill={RISK_CHART_CONFIG[2].color}
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="orange"
                        stackId="a"
                        fill={RISK_CHART_CONFIG[3].color}
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="red"
                        stackId="a"
                        fill={RISK_CHART_CONFIG[4].color}
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
