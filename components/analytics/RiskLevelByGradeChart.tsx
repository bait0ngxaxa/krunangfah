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
import type { GradeRiskData } from "@/lib/actions/analytics.actions";

interface RiskLevelByGradeChartProps {
    gradeRiskData: GradeRiskData[];
}

export function RiskLevelByGradeChart({
    gradeRiskData,
}: RiskLevelByGradeChartProps) {
    if (gradeRiskData.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    ข้อมูลนักเรียนแยกตามระดับชั้น
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
                ข้อมูลนักเรียนแยกตามระดับชั้น
            </h2>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={gradeRiskData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="grade"
                        label={{
                            value: "ระดับชั้น",
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
                    <Bar dataKey="red" stackId="a" fill="#EF4444" />
                    <Bar dataKey="orange" stackId="a" fill="#F97316" />
                    <Bar dataKey="yellow" stackId="a" fill="#FCD34D" />
                    <Bar dataKey="green" stackId="a" fill="#10B981" />
                    <Bar dataKey="blue" stackId="a" fill="#3B82F6" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
