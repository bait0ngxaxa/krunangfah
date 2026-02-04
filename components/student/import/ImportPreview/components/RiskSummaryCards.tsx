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
                    className={`${RISK_BG_CLASSES[level]} rounded-2xl p-4 text-white text-center shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl`}
                >
                    <p className="text-3xl font-bold mb-1">
                        {riskCounts[level]}
                    </p>
                    <p className="text-sm font-medium opacity-90">
                        {RISK_LABELS[level]}
                    </p>
                </div>
            ))}
        </div>
    );
}
