// components/student/activity/ActivityProgressTable/components/ActivityRow.tsx

import type { ActivityRowProps } from "../types";
import { getActivityName } from "../utils";
import { ActivityIcon } from "./ActivityIcon";
import { WorksheetPreviewButton } from "../../WorksheetPreviewButton";

/**
 * Single row component for desktop table view
 */
export function ActivityRow({ progress, index }: ActivityRowProps) {
    const isLocked = progress.status === "locked";
    const isCompleted = progress.status === "completed";
    const activityName = getActivityName(progress.activityNumber);

    return (
        <tr
            className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                index % 2 === 0 ? "bg-white" : "bg-gray-50"
            } ${isLocked ? "opacity-60" : ""}`}
        >
            <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                    <ActivityIcon
                        status={progress.status}
                        index={index}
                        isLocked={isLocked}
                    />
                    <span
                        className={`font-medium ${
                            isLocked ? "text-gray-400" : "text-gray-800"
                        }`}
                    >
                        {activityName}
                    </span>
                </div>
            </td>
            <td className="px-4 py-4">
                {progress.scheduledDate ? (
                    <span className="text-gray-700">
                        {new Date(progress.scheduledDate).toLocaleDateString(
                            "th-TH",
                        )}
                    </span>
                ) : (
                    <span className="text-gray-400 italic">ยังไม่ได้นัดหมาย</span>
                )}
            </td>
            <td className="px-4 py-4">
                <span className="text-gray-700">
                    {progress.teacher?.teacher
                        ? `${progress.teacher.teacher.firstName} ${progress.teacher.teacher.lastName}`
                        : "ยังไม่ได้กำหนด"}
                </span>
            </td>
            <td className="px-4 py-4 text-center">
                {isLocked ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        ล็อค
                    </span>
                ) : (
                    <WorksheetPreviewButton
                        uploads={progress.worksheetUploads}
                        isCompleted={isCompleted}
                    />
                )}
            </td>
        </tr>
    );
}
