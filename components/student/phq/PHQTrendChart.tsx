"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
} from "recharts";
import { TrendingUp, Activity, Clock3 } from "lucide-react";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";

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
        const risk = getRiskLevelConfig(data.riskLevel as RiskLevel);

        return (
            <div className="rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
                <p className="font-semibold text-gray-800 mb-2">{data.date}</p>
                <p className="text-sm text-gray-600 mb-1">
                    {data.academicYear}
                </p>
                <p className="text-lg font-bold text-gray-900">
                    คะแนน: {data.score}
                </p>
                <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${risk.bgLight} ${risk.textColorDark}`}
                >
                    {risk.label}
                </span>
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

    const latestResult = sortedResults.at(-1);
    const previousResult = sortedResults.at(-2);
    const latestRisk = (latestResult?.riskLevel ?? "blue") as RiskLevel;
    const latestRiskConfig = getRiskLevelConfig(latestRisk);
    const lineColor = latestRiskConfig.hexColor;
    const latestScore = latestResult?.totalScore ?? 0;
    const previousScore = previousResult?.totalScore ?? latestScore;
    const scoreDelta = latestScore - previousScore;
    const highestScore = sortedResults.reduce(
        (maxScore, current) => Math.max(maxScore, current.totalScore),
        0,
    );

    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/70 to-emerald-50/40 p-6 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)] transition-base duration-300 hover:shadow-[0_24px_44px_-24px_rgba(15,23,42,0.5)] md:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 -bottom-20 h-56 w-56 rounded-full bg-cyan-200/20 blur-3xl" />

            <div className="relative z-10">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-white text-[#0BD0D9] shadow-sm">
                            <TrendingUp className="h-5 w-5" />
                        </span>
                        กราฟแนวโน้มคะแนน PHQ-A
                    </h2>
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-bold ${latestRiskConfig.bgLight} ${latestRiskConfig.textColorDark}`}
                    >
                        สถานะล่าสุด: {latestRiskConfig.label}
                    </span>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white/85 px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500">
                            คะแนนล่าสุด
                        </p>
                        <p className="mt-1 text-2xl font-extrabold text-gray-900 tabular-nums">
                            {latestScore}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white/85 px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500">
                            เปลี่ยนจากครั้งก่อน
                        </p>
                        <p
                            className={`mt-1 text-2xl font-extrabold tabular-nums ${
                                scoreDelta > 0
                                    ? "text-red-600"
                                    : scoreDelta < 0
                                      ? "text-emerald-600"
                                      : "text-gray-700"
                            }`}
                        >
                            {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white/85 px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500">
                            ค่าสูงสุดที่เคยได้
                        </p>
                        <p className="mt-1 text-2xl font-extrabold text-gray-900 tabular-nums">
                            {highestScore}
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm">
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={320}>
                            <LineChart
                                data={chartData}
                                margin={{
                                    top: 12,
                                    right: 20,
                                    left: 8,
                                    bottom: 58,
                                }}
                                tabIndex={-1}
                            >
                                <ReferenceArea y1={0} y2={6} fill="#dbeafe" fillOpacity={0.25} />
                                <ReferenceArea y1={7} y2={12} fill="#dcfce7" fillOpacity={0.25} />
                                <ReferenceArea y1={13} y2={18} fill="#fef9c3" fillOpacity={0.3} />
                                <ReferenceArea y1={19} y2={24} fill="#ffedd5" fillOpacity={0.3} />
                                <ReferenceArea y1={25} y2={27} fill="#fee2e2" fillOpacity={0.35} />
                                <CartesianGrid
                                    strokeDasharray="4 4"
                                    stroke="#E5E7EB"
                                />
                                <XAxis
                                    dataKey="academicYear"
                                    stroke="#9CA3AF"
                                    style={{ fontSize: "11px" }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={84}
                                    label={{
                                        value: "ปีการศึกษา / ครั้งที่",
                                        position: "insideBottom",
                                        offset: -6,
                                        style: {
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            fill: "#6B7280",
                                        },
                                    }}
                                    tick={{ fill: "#6B7280" }}
                                    axisLine={{ stroke: "#D1D5DB" }}
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
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            fill: "#6B7280",
                                        },
                                    }}
                                    tick={{ fill: "#6B7280" }}
                                    axisLine={{ stroke: "#D1D5DB" }}
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
                                    activeDot={{
                                        r: 7,
                                        fill: lineColor,
                                        stroke: "#fff",
                                        strokeWidth: 2,
                                    }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="relative z-10 mt-4 rounded-2xl border border-gray-200 bg-white/75 p-4">
                <p className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-200 bg-white text-[#0BD0D9] shadow-sm">
                        <Activity className="h-3.5 w-3.5" />
                    </span>
                    คะแนนรวม 0-27 คะแนน
                    <span className="text-gray-300">|</span>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-200 bg-white text-[#0BD0D9] shadow-sm">
                        <Clock3 className="h-3.5 w-3.5" />
                    </span>
                    แสดงแนวโน้มจากเก่าสุด → ใหม่สุด
                </p>
            </div>
        </div>
    );
}
