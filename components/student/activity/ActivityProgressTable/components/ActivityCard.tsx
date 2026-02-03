// components/student/activity/ActivityProgressTable/components/ActivityCard.tsx

import { CheckCircle2 } from "lucide-react";
import type { ActivityCardProps } from "../types";
import { getActivityName } from "../utils";
import { ActivityStatusBadge } from "./ActivityStatusBadge";
import { WorksheetPreviewButton } from "../../WorksheetPreviewButton";

/**
 * Single card component for mobile view
 */
export function ActivityCard({ progress, index }: ActivityCardProps) {
    const isLocked = progress.status === "locked";
    const isCompleted = progress.status === "completed";
    const activityName = getActivityName(progress.activityNumber);

    const iconBgColor = isLocked
        ? "bg-gray-400"
        : isCompleted
          ? "bg-green-500"
          : "bg-purple-500";

    return (
        <div
            className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm ${
                isLocked ? "opacity-60" : ""
            }`}
        >
            <div className="flex items-start gap-3">
                <span
                    className={`w-8 h-8 ${iconBgColor} text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}
                >
                    {isLocked ? (
                        "🔒"
                    ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                    ) : (
                        index + 1
                    )}
                </span>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <p
                            className={`font-medium ${
                                isLocked ? "text-gray-400" : "text-gray-800"
                            }`}
                        >
                            {activityName}
                        </p>
                        <ActivityStatusBadge status={progress.status} />
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                        <p>
                            <span className="font-medium">วันที่:</span>{" "}
                            {progress.scheduledDate
                                ? new Date(
                                      progress.scheduledDate,
                                  ).toLocaleDateString("th-TH")
                                : "ยังไม่ได้นัดหมาย"}
                        </p>
                        <p>
                            <span className="font-medium">ครู:</span>{" "}
                            {progress.teacher?.teacher
                                ? `${progress.teacher.teacher.firstName} ${progress.teacher.teacher.lastName}`
                                : "ยังไม่ได้กำหนด"}
                        </p>
                        {isCompleted &&
                            progress.worksheetUploads.length > 0 && (
                                <div className="mt-2">
                                    <WorksheetPreviewButton
                                        uploads={progress.worksheetUploads}
                                        isCompleted={isCompleted}
                                    />
                                </div>
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
}
