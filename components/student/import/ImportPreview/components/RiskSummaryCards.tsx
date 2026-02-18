import { getRiskBgClass, getRiskLabel } from "@/lib/utils/phq-scoring";
import type { RiskCounts } from "../types";

interface RiskSummaryCardsProps {
    riskCounts: RiskCounts;
}

/**
 * Display risk level summary cards
 */
export function RiskSummaryCards({ riskCounts }: RiskSummaryCardsProps) {
    const cardData = [
        { level: "blue"   as const, bgClass: getRiskBgClass("blue"),   label: getRiskLabel("blue"),   count: riskCounts.blue },
        { level: "green"  as const, bgClass: getRiskBgClass("green"),  label: getRiskLabel("green"),  count: riskCounts.green },
        { level: "yellow" as const, bgClass: getRiskBgClass("yellow"), label: getRiskLabel("yellow"), count: riskCounts.yellow },
        { level: "orange" as const, bgClass: getRiskBgClass("orange"), label: getRiskLabel("orange"), count: riskCounts.orange },
        { level: "red"    as const, bgClass: getRiskBgClass("red"),    label: getRiskLabel("red"),    count: riskCounts.red },
    ];

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
