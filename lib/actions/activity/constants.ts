// Activity configuration constants
import { MAX_IMAGE_UPLOAD_SIZE } from "@/lib/constants/image-upload";

export const ACTIVITY_INDICES: Record<string, number[]> = {
    orange: [1, 2, 3, 4, 5],
    yellow: [1, 2, 3, 5],
    green: [1, 2, 5],
};

export function getActivityIndices(riskLevel: string): number[] {
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

interface ActivityProgressStatus {
    activityNumber: number;
    status: string;
}

export interface ActivitySequenceSummary {
    completedCount: number;
    isComplete: boolean;
}

export function getActivitySequenceSummary(
    riskLevel: string,
    activityProgress: readonly ActivityProgressStatus[],
): ActivitySequenceSummary {
    const activityNumbers = getActivityIndices(riskLevel);
    const completedActivityNumbers = new Set(
        activityProgress
            .filter((activity) => activity.status === "completed")
            .map((activity) => activity.activityNumber),
    );
    const completedCount = activityNumbers.filter((activityNumber) =>
        completedActivityNumbers.has(activityNumber),
    ).length;

    return {
        completedCount,
        isComplete:
            activityNumbers.length > 0 &&
            completedCount === activityNumbers.length,
    };
}

// Required number of worksheets per activity
export const REQUIRED_WORKSHEETS: Record<number, number> = {
    1: 2,
    2: 2,
    3: 2,
    4: 2,
    5: 1, // Activity 5 has only 1 worksheet
};

// Allowed file extensions for worksheet uploads (images only)
export const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

// Maximum file size after server-side compression
export const MAX_FILE_SIZE = MAX_IMAGE_UPLOAD_SIZE;
