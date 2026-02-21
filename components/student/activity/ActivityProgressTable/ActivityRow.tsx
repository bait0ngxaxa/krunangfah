import { CheckCircle2, Lock } from "lucide-react";
import { getActivityName } from "./utils";
import { WorksheetPreviewButton } from "../WorksheetPreviewButton";
import type { ActivityProgress } from "./types";

interface ActivityRowProps {
    progress: ActivityProgress;
    index: number;
}

function StatusBadge({ status }: { status: string }) {
    const isCompleted = status === "completed";
    const isLocked = status === "locked";

    const badgeClass = isCompleted
        ? "bg-green-50 text-green-700 border border-green-200"
        : isLocked
          ? "bg-gray-50 text-gray-500 border border-gray-200"
          : "bg-yellow-50 text-yellow-700 border border-yellow-200";

    const label = isCompleted ? "เสร็จแล้ว" : isLocked ? "ล็อค" : "กำลังทำ";

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${badgeClass}`}
        >
            {isCompleted && <CheckCircle2 className="w-3 h-3" />}
            {label}
        </span>
    );
}

function formatScheduledDate(date: Date): string {
    return new Date(date).toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function ActivityRow({ progress, index }: ActivityRowProps) {
    const isLocked = progress.status === "locked";
    const isCompleted = progress.status === "completed";
    const activityName = getActivityName(progress.activityNumber);

    const iconBgColor = isLocked
        ? "bg-gray-100 text-gray-400"
        : isCompleted
          ? "bg-green-100 text-green-600"
          : "bg-emerald-100 text-emerald-600";

    return (
        <tr
            className={`
                block md:table-row
                bg-white md:bg-transparent
                border border-emerald-100 md:border-none rounded-2xl md:rounded-none
                p-5 md:p-0
                mb-4 md:mb-0
                shadow-sm md:shadow-none
                hover:bg-emerald-50/30 transition-colors
                ${isLocked ? "opacity-60 grayscale" : ""}
            `}
        >
            {/* Column 1: Activity Name */}
            <td className="block md:table-cell md:px-6 md:py-5 mb-4 md:mb-0">
                <div className="flex items-center gap-4">
                    <span
                        className={`w-10 h-10 md:w-8 md:h-8 ${iconBgColor} rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm transition-transform hover:scale-110`}
                    >
                        {isLocked ? (
                            <Lock className="w-5 h-5 md:w-4 md:h-4" />
                        ) : isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 md:w-4 md:h-4" />
                        ) : (
                            index + 1
                        )}
                    </span>
                    <div className="flex-1 md:flex-none">
                        <span
                            className={`font-bold block text-lg md:text-sm ${
                                isLocked ? "text-gray-400" : "text-gray-800"
                            }`}
                        >
                            {activityName}
                        </span>
                        {/* Mobile: Show status badge inline */}
                        <div className="md:hidden mt-2">
                            <StatusBadge status={progress.status} />
                        </div>
                    </div>
                </div>
            </td>

            {/* Column 2: Scheduled Date */}
            <td className="block md:table-cell md:px-6 md:py-5 mb-2 md:mb-0">
                <div className="flex items-center justify-between md:block">
                    <span className="font-medium md:hidden text-gray-500 text-sm">
                        วันที่:{" "}
                    </span>
                    {progress.scheduledDate ? (
                        <span className="text-gray-700 font-medium bg-gray-50 px-2 py-1 rounded-lg text-sm">
                            {formatScheduledDate(progress.scheduledDate)}
                        </span>
                    ) : (
                        <span className="text-gray-400 italic text-sm">
                            ยังไม่ได้นัดหมาย
                        </span>
                    )}
                </div>
            </td>

            {/* Column 3: Teacher */}
            <td className="block md:table-cell md:px-6 md:py-5 mb-4 md:mb-0">
                <div className="flex items-center justify-between md:block">
                    <span className="font-medium md:hidden text-gray-500 text-sm">
                        ครู:{" "}
                    </span>
                    <span className="text-gray-700 text-sm">
                        {progress.teacher?.teacher
                            ? `${progress.teacher.teacher.firstName} ${progress.teacher.teacher.lastName}`
                            : "-"}
                    </span>
                </div>
            </td>

            {/* Column 4: Status / Action */}
            <td className="block md:table-cell md:px-6 md:py-5 md:text-center border-t border-gray-100 md:border-none pt-4 md:pt-0">
                {/* Desktop: Show status badge or preview button */}
                <div className="hidden md:flex justify-center">
                    {isLocked ? (
                        <StatusBadge status={progress.status} />
                    ) : (
                        <WorksheetPreviewButton
                            uploads={progress.worksheetUploads}
                            isCompleted={isCompleted}
                            activityNumber={progress.activityNumber}
                        />
                    )}
                </div>

                {/* Mobile: Show preview button if completed */}
                {!isLocked &&
                    isCompleted &&
                    progress.worksheetUploads.length > 0 && (
                        <div className="md:hidden flex justify-end">
                            <WorksheetPreviewButton
                                uploads={progress.worksheetUploads}
                                isCompleted={isCompleted}
                                activityNumber={progress.activityNumber}
                            />
                        </div>
                    )}
            </td>
        </tr>
    );
}
