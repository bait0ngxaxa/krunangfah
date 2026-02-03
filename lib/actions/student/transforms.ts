/**
 * Student Transform Functions
 * Convert raw query results to typed responses
 */

import type { RiskCountRaw, RiskCountsResponse } from "./types";

/**
 * Transform raw risk level counts to RiskCountsResponse
 */
export function transformRiskCounts(
    rawCounts: RiskCountRaw[],
    classes: string[],
): RiskCountsResponse {
    const riskCounts: RiskCountsResponse = {
        red: 0,
        orange: 0,
        yellow: 0,
        green: 0,
        blue: 0,
        total: 0,
        classes,
    };

    for (const row of rawCounts) {
        const level = row.risk_level as
            | "red"
            | "orange"
            | "yellow"
            | "green"
            | "blue";
        const riskLevels = [
            "red",
            "orange",
            "yellow",
            "green",
            "blue",
        ] as const;
        if (riskLevels.includes(level as (typeof riskLevels)[number])) {
            riskCounts[level] = Number(row.count);
            riskCounts.total += Number(row.count);
        }
    }

    return riskCounts;
}
