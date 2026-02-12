"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

interface PHQResult {
    totalScore: number;
    riskLevel: string;
    createdAt: Date;
    assessmentRound: number;
    academicYear: {
        year: number;
        semester: number;
    };
}

interface PHQTrendChartProps {
    results: PHQResult[];
}

const riskColors: Record<RiskLevel, string> = {
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    orange: "#f97316",
    red: "#ef4444",
};

interface ChartDataPoint {
    date: string;
    score: number;
    academicYear: string;
    riskLevel: string;
}

function CustomTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{
        payload: ChartDataPoint;
    }>;
}) {
    if (active && payload && payload.length > 0) {
        const data = payload[0].payload;

        return (
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200">
                <p className="font-semibold text-gray-800 mb-2">{data.date}</p>
                <p className="text-sm text-gray-600 mb-1">
                    {data.academicYear}
                </p>
                <p className="text-lg font-bold text-purple-600">
                    คะแนน: {data.score}
                </p>
            </div>
        );
    }
    return null;
}

export function PHQTrendChart({ results }: PHQTrendChartProps) {
    if (results.length === 0) {
        return null;
    }

    // Sort by academic year, semester, and round (oldest → newest)
    const sortedResults = [...results].sort((a, b) => {
        // Compare year
        if (a.academicYear.year !== b.academicYear.year) {
            return a.academicYear.year - b.academicYear.year;
        }
        // Compare semester
        if (a.academicYear.semester !== b.academicYear.semester) {
            return a.academicYear.semester - b.academicYear.semester;
        }
        // Compare assessment round
        return a.assessmentRound - b.assessmentRound;
    });

    // Prepare data for chart
    const chartData = sortedResults.map((result) => ({
        date: new Date(result.createdAt).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "2-digit",
        }),
        score: result.totalScore,
        academicYear: `${result.academicYear.semester}/${result.academicYear.year} ครั้งที่ ${result.assessmentRound}`,
        riskLevel: result.riskLevel,
    }));

    // Get color based on latest risk level
    const latestRisk = results[0].riskLevel as RiskLevel;
    const lineColor = riskColors[latestRisk] || riskColors.blue;

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-pink-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-rose-500" />
                <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                    กราฟแนวโน้มคะแนน PHQ-A
                </span>
            </h2>

            <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" />
                        <XAxis
                            dataKey="academicYear"
                            stroke="#9CA3AF"
                            style={{ fontSize: "11px" }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            label={{
                                value: "ปีการศึกษา / ครั้งที่",
                                position: "insideBottom",
                                offset: -10,
                                style: {
                                    fontSize: "13px",
                                    fontWeight: "bold",
                                    fill: "#6B7280",
                                },
                            }}
                            tick={{ fill: "#6B7280" }}
                            axisLine={{ stroke: "#FBCFE8" }}
                        />
                        <YAxis
                            domain={[0, 27]}
                            ticks={[0, 5, 10, 15, 20, 25, 27]}
                            stroke="#9CA3AF"
                            style={{ fontSize: "12px" }}
                            label={{
                                value: "คะแนน PHQ-A",
                                angle: -90,
                                position: "insideLeft",
                                style: {
                                    fontSize: "13px",
                                    fontWeight: "bold",
                                    fill: "#6B7280",
                                },
                            }}
                            tick={{ fill: "#6B7280" }}
                            axisLine={{ stroke: "#FBCFE8" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="score"
                            stroke={lineColor}
                            strokeWidth={3}
                            dot={{
                                fill: lineColor,
                                r: 5,
                                strokeWidth: 2,
                                stroke: "#fff",
                            }}
                            activeDot={{ r: 7 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 p-4 bg-pink-50/50 rounded-xl border border-pink-100">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="font-semibold text-pink-600">
                        หมายเหตุ:
                    </span>{" "}
                    คะแนนรวม 0-27 คะแนน | กราฟแสดงแนวโน้มจากเก่าสุด → ใหม่สุด
                </p>
            </div>
        </div>
    );
}
