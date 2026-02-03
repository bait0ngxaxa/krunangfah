// components/student/activity/ActivityProgressTable/ActivityProgressTable.tsx

import { getActivityProgress } from "@/lib/actions/activity";
import { FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { ActivityProgressTableProps, ActivityProgress } from "./types";
import {
    getActivityNumbers,
    getCompletedCount,
    getActivityName,
} from "./utils";
import { WorksheetPreviewButton } from "../WorksheetPreviewButton";

/**
 * Main Server Component for Activity Progress Table
 * Uses CSS-only responsive design (table on desktop, stacked cards on mobile)
 */
export async function ActivityProgressTable({
    studentId,
    phqResultId,
    riskLevel,
}: ActivityProgressTableProps) {
    const activityNumbers = getActivityNumbers(riskLevel);

    // Don't show for red/blue risk levels
    if (activityNumbers.length === 0) {
        return null;
    }

    // Fetch activity progress data
    const result = await getActivityProgress(studentId, phqResultId);

    if (!result.success || !result.data) {
        return (
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 border border-white/50">
                <p className="text-gray-500 text-center">
                    ไม่สามารถโหลดข้อมูลกิจกรรมได้
                </p>
            </div>
        );
    }

    const progressData = result.data;
    const completedCount = getCompletedCount(progressData);

    const getRiskLevelLabel = (level: string): string => {
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
    };

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-purple-500 to-pink-500" />

            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                            กิจกรรมช่วยเหลือนักเรียนกลุ่มสี
                            {getRiskLevelLabel(riskLevel)}
                        </h2>
                        <p className="text-gray-600 text-sm">
                            เสร็จแล้ว {completedCount}/{activityNumbers.length}{" "}
                            กิจกรรม
                        </p>
                    </div>
                </div>
                <Link
                    href={`/students/${studentId}/help/start`}
                    className="px-4 py-2 bg-purple-500 text-white rounded-full text-sm font-medium hover:bg-purple-600 transition-colors"
                >
                    ทำกิจกรรม
                </Link>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    {/* Desktop Header - Hidden on Mobile */}
                    <thead className="hidden md:table-header-group">
                        <tr className="bg-linear-to-r from-indigo-600 to-purple-600 text-white">
                            <th className="px-4 py-3 text-left rounded-tl-xl">
                                กิจกรรมที่ต้องทำ
                            </th>
                            <th className="px-4 py-3 text-left">
                                วันที่นัดหมาย
                            </th>
                            <th className="px-4 py-3 text-left">
                                ครูผู้ทำกิจกรรม
                            </th>
                            <th className="px-4 py-3 text-center rounded-tr-xl">
                                สถานะ
                            </th>
                        </tr>
                    </thead>

                    {/* Table Body - Responsive */}
                    <tbody className="block md:table-row-group">
                        {progressData.map((progress, index) => (
                            <ActivityRow
                                key={progress.id}
                                progress={progress}
                                index={index}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * Activity Row Component - Responsive
 * Desktop: Table row | Mobile: Card-like block
 */
function ActivityRow({
    progress,
    index,
}: {
    progress: ActivityProgress;
    index: number;
}) {
    const isLocked = progress.status === "locked";
    const isCompleted = progress.status === "completed";
    const activityName = getActivityName(progress.activityNumber);

    // Icon background color
    const iconBgColor = isLocked
        ? "bg-gray-400"
        : isCompleted
          ? "bg-green-500"
          : "bg-purple-500";

    // Status badge
    const getStatusBadge = () => {
        const badgeClass = isCompleted
            ? "bg-green-100 text-green-700"
            : isLocked
              ? "bg-gray-100 text-gray-500"
              : "bg-yellow-100 text-yellow-700";

        const label = isCompleted ? "เสร็จแล้ว" : isLocked ? "ล็อค" : "กำลังทำ";

        return (
            <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}
            >
                {label}
            </span>
        );
    };

    return (
        <tr
            className={`
                block md:table-row
                bg-white border border-gray-200 rounded-xl md:rounded-none
                p-4 md:p-0
                mb-4 md:mb-0
                shadow-sm md:shadow-none
                md:border-b md:border-l-0 md:border-r-0 md:border-t-0
                hover:bg-gray-50 transition-colors
                ${index % 2 === 0 ? "md:bg-white" : "md:bg-gray-50"}
                ${isLocked ? "opacity-60" : ""}
            `}
        >
            {/* Column 1: Activity Name */}
            <td className="block md:table-cell md:px-4 md:py-4 mb-3 md:mb-0">
                <div className="flex items-center gap-2">
                    {/* Icon */}
                    <span
                        className={`w-8 h-8 md:w-6 md:h-6 ${iconBgColor} text-white rounded-full flex items-center justify-center text-sm md:text-xs font-bold shrink-0`}
                    >
                        {isLocked ? (
                            "🔒"
                        ) : isCompleted ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            index + 1
                        )}
                    </span>
                    <div className="flex-1 md:flex-none">
                        <span
                            className={`font-medium ${
                                isLocked ? "text-gray-400" : "text-gray-800"
                            }`}
                        >
                            {activityName}
                        </span>
                        {/* Mobile: Show status badge inline */}
                        <div className="md:hidden mt-2">{getStatusBadge()}</div>
                    </div>
                </div>
            </td>

            {/* Column 2: Scheduled Date */}
            <td className="block md:table-cell md:px-4 md:py-4 mb-2 md:mb-0">
                <span className="font-medium md:hidden text-gray-600">
                    วันที่:{" "}
                </span>
                {progress.scheduledDate ? (
                    <span className="text-gray-700">
                        {new Date(progress.scheduledDate).toLocaleDateString(
                            "th-TH",
                        )}
                    </span>
                ) : (
                    <span className="text-gray-400 italic">
                        ยังไม่ได้นัดหมาย
                    </span>
                )}
            </td>

            {/* Column 3: Teacher */}
            <td className="block md:table-cell md:px-4 md:py-4 mb-3 md:mb-0">
                <span className="font-medium md:hidden text-gray-600">
                    ครู:{" "}
                </span>
                <span className="text-gray-700">
                    {progress.teacher?.teacher
                        ? `${progress.teacher.teacher.firstName} ${progress.teacher.teacher.lastName}`
                        : "ยังไม่ได้กำหนด"}
                </span>
            </td>

            {/* Column 4: Status / Action */}
            <td className="block md:table-cell md:px-4 md:py-4 md:text-center">
                {/* Desktop: Show status badge or preview button */}
                <div className="hidden md:block">
                    {isLocked ? (
                        getStatusBadge()
                    ) : (
                        <WorksheetPreviewButton
                            uploads={progress.worksheetUploads}
                            isCompleted={isCompleted}
                        />
                    )}
                </div>

                {/* Mobile: Show preview button if completed */}
                {!isLocked &&
                    isCompleted &&
                    progress.worksheetUploads.length > 0 && (
                        <div className="md:hidden">
                            <WorksheetPreviewButton
                                uploads={progress.worksheetUploads}
                                isCompleted={isCompleted}
                            />
                        </div>
                    )}
            </td>
        </tr>
    );
}
