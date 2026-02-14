"use client";

import { useMemo, memo } from "react";
import { Inbox } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface RiskPieChartDataItem {
    name: string;
    value: number;
    color: string;
}

export interface RiskPieChartProps {
    data: RiskPieChartDataItem[];
    title?: string;
    height?: number;
    outerRadius?: number;
    showPercentageInLegend?: boolean;
}

// Constants outside component to avoid re-creation
const RADIAN = Math.PI / 180;

const TOOLTIP_STYLE = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: "1rem",
    border: "1px solid #FCE7F3",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    padding: "12px",
};

const TOOLTIP_ITEM_STYLE = { color: "#4B5563", fontWeight: 500 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderInsideLabel(props: any): React.ReactElement | null {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight="bold"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
}

// Memoized legend component
const CustomLegend = memo(function CustomLegend({
    data,
    total,
    showPercentage,
}: {
    data: RiskPieChartDataItem[];
    total: number;
    showPercentage: boolean;
}) {
    return (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-4 px-2 animate-[fadeIn_0.5s_ease-out_0.6s_both]">
            {data.map((item) => (
                <div
                    key={item.name}
                    className="flex items-center gap-1.5 text-xs sm:text-sm"
                >
                    <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700">
                        {item.name}: {item.value} คน
                        {showPercentage &&
                            total > 0 &&
                            ` (${((item.value / total) * 100).toFixed(0)}%)`}
                    </span>
                </div>
            ))}
        </div>
    );
});

function formatTooltipValue(value: unknown): [string, string] {
    const numValue = typeof value === "number" ? value : 0;
    return [`${numValue} คน`, "จำนวน"];
}

function RiskPieChartComponent({
    data,
    title,
    height = 300,
    outerRadius = 100,
    showPercentageInLegend = false,
}: RiskPieChartProps): React.ReactElement {
    const chartData = useMemo(
        () => data.filter((item) => item.value > 0),
        [data],
    );

    const total = useMemo(
        () => data.reduce((sum, item) => sum + item.value, 0),
        [data],
    );

    if (chartData.length === 0) {
        return (
            <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-pink-200 ring-1 ring-pink-50 p-8 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
                {/* Decorations */}
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-rose-200/40 to-pink-300/30 rounded-full blur-xl pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

                {title && (
                    <h2 className="relative text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">
                        {title}
                    </h2>
                )}
                <div className="relative text-gray-400 flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full bg-pink-300 blur-lg opacity-20" />
                        <div className="relative w-full h-full bg-gray-50 rounded-full flex items-center justify-center ring-1 ring-gray-100">
                            <Inbox className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                    <span>ยังไม่มีข้อมูลการคัดกรอง</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-pink-200 ring-1 ring-pink-50 p-4 sm:p-6 pb-6 sm:pb-8 overflow-hidden"
            style={{ contain: "layout style paint" }}
        >
            {/* Corner decoration */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-rose-200/40 to-pink-300/30 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

            {title && (
                <h2 className="relative text-lg sm:text-xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-4 sm:mb-6 text-center">
                    {title}
                </h2>
            )}
            <ResponsiveContainer width="100%" height={height}>
                <PieChart tabIndex={-1}>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderInsideLabel}
                        outerRadius={outerRadius}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                        isAnimationActive={true}
                    >
                        {chartData.map((entry) => (
                            <Cell
                                key={`cell-${entry.name}`}
                                fill={entry.color}
                                stroke="white"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        itemStyle={TOOLTIP_ITEM_STYLE}
                        formatter={formatTooltipValue}
                    />
                </PieChart>
            </ResponsiveContainer>
            <CustomLegend
                data={chartData}
                total={total}
                showPercentage={showPercentageInLegend}
            />
        </div>
    );
}

export const RiskPieChart = memo(RiskPieChartComponent);
RiskPieChart.displayName = "RiskPieChart";
