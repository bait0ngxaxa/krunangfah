"use client";

import { useMemo, memo } from "react";
import { Inbox } from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    type PieLabelRenderProps,
} from "recharts";

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
    border: "1px solid #D1FAE5",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    padding: "12px",
};

const TOOLTIP_ITEM_STYLE = { color: "#4B5563", fontWeight: 500 };

function renderOuterLabel(
    props: PieLabelRenderProps,
): React.ReactElement | null {
    const { cx, cy, midAngle, outerRadius, percent, name, fill } = props;

    if (
        percent === null ||
        percent === undefined ||
        percent === 0 ||
        midAngle === null ||
        midAngle === undefined ||
        typeof cx !== "number" ||
        typeof cy !== "number" ||
        typeof outerRadius !== "number"
    ) {
        return null;
    }

    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);

    // Point on the edge of the pie
    const edgeX = cx + outerRadius * cos;
    const edgeY = cy + outerRadius * sin;

    // Elbow point (extends outward)
    const elbowX = cx + (outerRadius + 14) * cos;
    const elbowY = cy + (outerRadius + 14) * sin;

    // End of the horizontal line
    const isRight = cos >= 0;
    const lineEndX = elbowX + (isRight ? 20 : -20);

    const percentText = `${(percent * 100).toFixed(0)}%`;

    return (
        <g>
            {/* Leader line: edge → elbow → horizontal */}
            <polyline
                points={`${edgeX},${edgeY} ${elbowX},${elbowY} ${lineEndX},${elbowY}`}
                fill="none"
                stroke={fill}
                strokeWidth={1.5}
                strokeOpacity={0.6}
            />
            {/* Dot at the edge */}
            <circle cx={edgeX} cy={edgeY} r={2.5} fill={fill} />
            {/* Label text */}
            <text
                x={lineEndX + (isRight ? 4 : -4)}
                y={elbowY}
                fill="#374151"
                textAnchor={isRight ? "start" : "end"}
                dominantBaseline="central"
                fontSize={13}
                fontWeight="600"
            >
                {name} {percentText}
            </text>
        </g>
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
            <div className="relative bg-white rounded-2xl shadow-sm border-2 border-emerald-100 p-8 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
                {title && (
                    <h2 className="relative text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">
                        {title}
                    </h2>
                )}
                <div className="relative text-gray-400 flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full bg-emerald-300 blur-lg opacity-20" />
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
            className="relative bg-white rounded-2xl shadow-sm border-2 border-emerald-100 p-4 sm:p-6 pb-6 sm:pb-8 overflow-hidden"
            style={{ contain: "layout style paint" }}
        >
            {title && (
                <h2 className="relative text-lg sm:text-xl font-bold text-emerald-600 mb-4 sm:mb-6 text-center">
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
                        label={renderOuterLabel}
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
