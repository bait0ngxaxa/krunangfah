import {
    RISK_CHART_LEVELS,
    getRiskBgClass,
    getRiskLabel,
    type RiskLevel,
} from "@/lib/constants/risk-levels";
import type { RiskCounts } from "../types";

interface RiskSummaryCardsProps {
    riskCounts: RiskCounts;
}

function getRiskCount(riskCounts: RiskCounts, level: RiskLevel): number {
    switch (level) {
        case "blue":
            return riskCounts.blue;
        case "green":
            return riskCounts.green;
        case "yellow":
            return riskCounts.yellow;
        case "orange":
            return riskCounts.orange;
        case "red":
            return riskCounts.red;
    }
}

/**
 * Display risk level summary cards
 */
export function RiskSummaryCards({ riskCounts }: RiskSummaryCardsProps) {
    const cardData = RISK_CHART_LEVELS.map((level) => ({
        level,
        bgClass: getRiskBgClass(level),
        label: getRiskLabel(level),
        count: getRiskCount(riskCounts, level),
    }));

    return (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            {cardData.map(({ level, bgClass, label, count }) => (
                <div
                    key={level}
                    className={`${bgClass} rounded-xl p-4 text-center text-white`}
                >
                    <p className="mb-1 text-2xl font-bold tabular-nums">
                        {count}
                    </p>
                    <p className="break-words text-sm font-medium opacity-95">
                        {label}
                    </p>
                </div>
            ))}
        </div>
    );
}
