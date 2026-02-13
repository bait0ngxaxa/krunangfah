"use client";

import { TrendingUp } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { TrendDataPoint } from "@/lib/actions/analytics";

interface RiskLevelTrendChartProps {
    trendData: TrendDataPoint[];
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

export function RiskLevelTrendChart({ trendData }: RiskLevelTrendChartProps) {
    if (trendData.length === 0) {
        return (
            <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-8 flex flex-col items-center justify-center min-h-[400px] overflow-hidden">
                {/* Decorations */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

                <h2 className="relative text-xl font-bold text-gray-800 mb-4 text-center">
                    กราฟแนวโน้มระดับความเสี่ยง
                </h2>
                <div className="relative text-gray-400 flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full bg-pink-300 blur-lg opacity-20" />
                        <div className="relative w-full h-full bg-gray-50 rounded-full flex items-center justify-center ring-1 ring-gray-100">
                            <TrendingUp className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                    <span>ยังไม่มีข้อมูลการคัดกรอง</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-4 sm:p-6 overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

            <h2 className="relative text-lg sm:text-xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-4 sm:mb-6 text-center">
                กราฟแนวโน้มระดับความเสี่ยง
            </h2>
            <CustomLegend />
            <ResponsiveContainer width="100%" height={350}>
                <LineChart
                    data={trendData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    tabIndex={-1}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" />
                    <XAxis
                        dataKey="period"
                        label={{
                            value: "เทอม",
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
                    <Line
                        type="monotone"
                        dataKey="blue"
                        stroke="#60A5FA"
                        strokeWidth={3}
                        dot={{
                            r: 4,
                            fill: "#60A5FA",
                            strokeWidth: 2,
                            stroke: "#fff",
                        }}
                        activeDot={{ r: 6, stroke: "#60A5FA", strokeWidth: 0 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="green"
                        stroke="#34D399"
                        strokeWidth={3}
                        dot={{
                            r: 4,
                            fill: "#34D399",
                            strokeWidth: 2,
                            stroke: "#fff",
                        }}
                        activeDot={{ r: 6, stroke: "#34D399", strokeWidth: 0 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="yellow"
                        stroke="#FBBF24"
                        strokeWidth={3}
                        dot={{
                            r: 4,
                            fill: "#FBBF24",
                            strokeWidth: 2,
                            stroke: "#fff",
                        }}
                        activeDot={{ r: 6, stroke: "#FBBF24", strokeWidth: 0 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="orange"
                        stroke="#F97316"
                        strokeWidth={3}
                        dot={{
                            r: 4,
                            fill: "#F97316",
                            strokeWidth: 2,
                            stroke: "#fff",
                        }}
                        activeDot={{ r: 6, stroke: "#F97316", strokeWidth: 0 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="red"
                        stroke="#F43F5E"
                        strokeWidth={3}
                        dot={{
                            r: 4,
                            fill: "#F43F5E",
                            strokeWidth: 2,
                            stroke: "#fff",
                        }}
                        activeDot={{ r: 6, stroke: "#F43F5E", strokeWidth: 0 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
