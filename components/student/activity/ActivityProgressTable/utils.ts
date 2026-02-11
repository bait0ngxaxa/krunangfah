// components/student/activity/ActivityProgressTable/utils.ts

import { ACTIVITIES, ACTIVITY_INDICES } from "./constants";
import type { ActivityProgress } from "./types";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

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
    return ACTIVITY_INDICES[riskLevel] || [];
}

export function getRiskLevelLabel(level: string): string {
    switch (level) {
        case "orange":
            return "ส้ม";
        case "yellow":
            return "เหลือง";
        case "green":
            return "เขียว";
        default:
            return level;
    }
}
