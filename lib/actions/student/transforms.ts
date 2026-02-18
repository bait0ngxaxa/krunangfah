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
        const count = Number(row.count);
        switch (row.risk_level) {
            case "red":    riskCounts.red    = count; break;
            case "orange": riskCounts.orange = count; break;
            case "yellow": riskCounts.yellow = count; break;
            case "green":  riskCounts.green  = count; break;
            case "blue":   riskCounts.blue   = count; break;
            default:       continue;
        }
        riskCounts.total += count;
    }

    return riskCounts;
}
