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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {cardData.map(({ level, bgClass, label, count }) => (
                <div
                    key={level}
                    className={`${bgClass} rounded-2xl p-4 text-white text-center shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl`}
                >
                    <p className="text-3xl font-bold mb-1">{count}</p>
                    <p className="text-sm font-medium opacity-90">{label}</p>
                </div>
            ))}
        </div>
    );
}
