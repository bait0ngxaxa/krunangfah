// components/student/activity/ActivityProgressTable/utils.ts

import { ACTIVITIES, ACTIVITY_INDICES } from "./constants";
import type { ActivityProgress } from "./types";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";

/**
 * Helper functions for ActivityProgressTable
 */

export function getActivityName(activityNumber: number): string {
    const activity = ACTIVITIES.find((a) => a.number === activityNumber);
    return activity?.name || `กิจกรรมที่ ${activityNumber}`;
}

export function getCompletedCount(progressData: ActivityProgress[]): number {
    return progressData.filter((p) => p.status === "completed").length;
}

export function getActivityNumbers(riskLevel: RiskLevel): number[] {
    switch (riskLevel) {
        case "orange":
            return ACTIVITY_INDICES.orange;
        case "yellow":
            return ACTIVITY_INDICES.yellow;
        case "green":
            return ACTIVITY_INDICES.green;
        default:
            return [];
    }
}

export function getRiskLevelLabel(level: string): string {
    const validLevels = ["red", "orange", "yellow", "green", "blue"];
    if (validLevels.includes(level)) {
        return getRiskLevelConfig(level as RiskLevel).label;
    }
    return level;
}
