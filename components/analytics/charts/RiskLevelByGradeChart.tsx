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
import type { GradeRiskData } from "@/lib/actions/analytics/types";
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
            <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-8 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)]">
                <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan-200/25 blur-3xl" />

                <h2 className="relative mb-4 text-center text-xl font-bold text-slate-800">
                    ข้อมูลนักเรียนแยกตามระดับชั้น
                </h2>
                <div className="relative flex flex-col items-center gap-3 text-gray-400">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full bg-emerald-300/35 blur-lg" />
                        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-white/85 ring-1 ring-gray-200/70">
                            <BarChart3 className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                    <span>ยังไม่มีข้อมูลการคัดกรอง</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-4 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)] sm:p-6">
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan-200/25 blur-3xl" />

            <h2 className="relative mb-4 text-center text-lg font-bold text-slate-800 sm:mb-6 sm:text-xl">
                ข้อมูลนักเรียนแยกตามระดับชั้น
            </h2>
            <CustomLegend />
            <ResponsiveContainer width="100%" height={350} minWidth={0} minHeight={350}>
                <BarChart
                    data={gradeRiskData}
                    margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                    tabIndex={-1}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
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
                        axisLine={{ stroke: "#CBD5E1" }}
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
                        axisLine={{ stroke: "#CBD5E1" }}
                        width={50}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderRadius: "1rem",
                            border: "1px solid #CBD5E1",
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
