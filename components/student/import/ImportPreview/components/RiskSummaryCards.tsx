import {
    RISK_LABELS,
    RISK_BG_CLASSES,
    type RiskLevel,
} from "@/lib/utils/phq-scoring";
import type { RiskCounts } from "../types";

interface RiskSummaryCardsProps {
    riskCounts: RiskCounts;
}

/**
 * Display risk level summary cards
 */
export function RiskSummaryCards({ riskCounts }: RiskSummaryCardsProps) {
    const riskLevels: RiskLevel[] = [
        "blue",
        "green",
        "yellow",
        "orange",
        "red",
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {riskLevels.map((level) => (
                <div
                    key={level}
                    className={`${RISK_BG_CLASSES[level]} rounded-lg p-4 text-white text-center`}
                >
                    <p className="text-2xl font-bold">{riskCounts[level]}</p>
                    <p className="text-sm opacity-90">{RISK_LABELS[level]}</p>
                </div>
            ))}
        </div>
    );
}
