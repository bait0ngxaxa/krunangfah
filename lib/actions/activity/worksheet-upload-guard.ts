import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import { getRequiredWorksheetCount } from "./constants";

export type WorksheetUploadRejectionCode =
    | "UPLOAD_ACTIVITY_LOCKED"
    | "UPLOAD_ACTIVITY_COMPLETED"
    | "UPLOAD_LIMIT_REACHED";

export interface WorksheetUploadRejection {
    code: WorksheetUploadRejectionCode;
    message: string;
}

interface UploadTargetActivity {
    status: string;
    activityNumber: number;
}

/**
 * Worksheets are accepted only for the open activity and only up to its
 * requirement; anything else means the client is showing stale state.
 */
export function getWorksheetUploadRejection(
    activity: UploadTargetActivity,
    uploadedCount: number,
): WorksheetUploadRejection | null {
    if (activity.status === "locked") {
        return { code: "UPLOAD_ACTIVITY_LOCKED", message: ERROR_MESSAGES.activity.notOpen };
    }
    if (activity.status !== "in_progress") {
        return {
            code: "UPLOAD_ACTIVITY_COMPLETED",
            message: ERROR_MESSAGES.activity.alreadySubmitted,
        };
    }

    const requiredCount = getRequiredWorksheetCount(activity.activityNumber);
    if (uploadedCount >= requiredCount) {
        return {
            code: "UPLOAD_LIMIT_REACHED",
            message: ERROR_MESSAGES.activity.worksheetLimitReached(requiredCount),
        };
    }
    return null;
}
