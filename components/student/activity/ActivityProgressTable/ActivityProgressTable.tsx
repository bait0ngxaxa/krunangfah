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
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-pink-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-linear-to-br from-rose-400 to-pink-500 rounded-2xl rotate-3 flex items-center justify-center text-white shadow-lg shadow-pink-200">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            กิจกรรมช่วยเหลือนักเรียนกลุ่มสี
                            <span className="text-pink-600 ml-2">
                                {getRiskLevelLabel(riskLevel)}
                            </span>
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-500 text-sm font-medium">
                                ความคืบหน้า:
                            </span>
                            <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-linear-to-r from-rose-400 to-pink-500"
                                    style={{
                                        width: `${(completedCount / activityNumbers.length) * 100}%`,
                                    }}
                                />
                            </div>
                            <span className="text-xs text-gray-500 font-bold">
                                {completedCount}/{activityNumbers.length}
                            </span>
                        </div>
                    </div>
                </div>
                <Link
                    href={`/students/${studentId}/help/start`}
                    className="px-6 py-3 bg-linear-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-pink-200 hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2"
                >
                    <span>🚀</span>
                    ทำกิจกรรม
                </Link>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto rounded-xl border border-pink-100">
                <table className="w-full">
                    {/* Desktop Header - Hidden on Mobile */}
                    <thead className="hidden md:table-header-group">
                        <tr className="bg-pink-50/80 border-b border-pink-200 text-gray-700">
                            <th className="px-6 py-4 text-left font-bold">
                                กิจกรรมที่ต้องทำ
                            </th>
                            <th className="px-6 py-4 text-left font-bold">
                                วันที่นัดหมาย
                            </th>
                            <th className="px-6 py-4 text-left font-bold">
                                ครูผู้ทำกิจกรรม
                            </th>
                            <th className="px-6 py-4 text-center font-bold">
                                สถานะ
                            </th>
                        </tr>
                    </thead>

                    {/* Table Body - Responsive */}
                    <tbody className="block md:table-row-group divide-y divide-pink-50">
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
        ? "bg-gray-100 text-gray-400"
        : isCompleted
          ? "bg-green-100 text-green-600"
          : "bg-rose-100 text-rose-600";

    // Status badge
    const getStatusBadge = () => {
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
    };

    return (
        <tr
            className={`
                block md:table-row
                bg-white md:bg-transparent
                border border-pink-100 md:border-none rounded-2xl md:rounded-none
                p-5 md:p-0
                mb-4 md:mb-0
                shadow-sm md:shadow-none
                hover:bg-pink-50/30 transition-colors
                ${isLocked ? "opacity-60 grayscale" : ""}
            `}
        >
            {/* Column 1: Activity Name */}
            <td className="block md:table-cell md:px-6 md:py-5 mb-4 md:mb-0">
                <div className="flex items-center gap-4">
                    {/* Icon */}
                    <span
                        className={`w-10 h-10 md:w-8 md:h-8 ${iconBgColor} rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm transition-transform hover:scale-110`}
                    >
                        {isLocked ? (
                            "🔒"
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
                        <div className="md:hidden mt-2">{getStatusBadge()}</div>
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
                            {new Date(
                                progress.scheduledDate,
                            ).toLocaleDateString("th-TH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}
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
                        getStatusBadge()
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
