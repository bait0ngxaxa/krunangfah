import { CheckCircle2, Lock, BarChart3 } from "lucide-react";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";
import type { Activity } from "../constants";
import type { ActivityProgressData } from "../types";

interface ProgressIndicatorProps {
    activities: Activity[];
    activityProgress: ActivityProgressData[];
    activityNumbers: number[];
    currentActivityNumber: number;
    riskLevel: "orange" | "yellow" | "green";
}

function getProgressPercentage(completedCount: number, total: number): number {
    const maxSegments = Math.max(total - 1, 1);
    const completedSegments = Math.min(Math.max(completedCount, 0), maxSegments);

    return (completedSegments / maxSegments) * 100;
}

function getActivityDisplayIndex(
    activityNumbers: number[],
    activityNumber: number,
): number {
    const index = activityNumbers.indexOf(activityNumber);

    return index >= 0 ? index + 1 : activityNumber;
}

function getActivityLabel(title: string): string {
    return title.split(": ")[1] || title;
}

/**
 * Progress indicator showing activity completion status
 */
export function ProgressIndicator({
    activities,
    activityProgress,
    activityNumbers,
    currentActivityNumber,
    riskLevel,
}: ProgressIndicatorProps) {
    const progressByActivityNumber = new Map(
        activityProgress.map((progress) => [
            progress.activityNumber,
            progress,
        ]),
    );
    const completedCount = activities.filter(
        (activity) =>
            progressByActivityNumber.get(activity.number)?.status ===
            "completed",
    ).length;
    const progressPercentage = getProgressPercentage(
        completedCount,
        activities.length,
    );
    const activeCircleStyle = getRiskLevelConfig(riskLevel).circleActive;

    return (
        <div className="mb-10 rounded-3xl border border-gray-200/80 bg-white/90 p-6 shadow-sm sm:p-8">
            <h3 className="text-xl font-bold mb-8 sm:mb-10 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm">
                    <BarChart3 className="w-6 h-6" />
                </div>
                <span className="text-gray-900">ความคืบหน้า</span>
            </h3>

            {/* Desktop: Horizontal Timeline (md+) */}
            <div className="hidden md:block relative">
                <div className="absolute left-5 right-5 top-[17px] z-0 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                        className="h-full rounded-full bg-[#34D399] shadow-sm transition-base duration-1000 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                <div className="flex justify-between items-start">
                    {activities.map((activity) => {
                        const progress = progressByActivityNumber.get(
                            activity.number,
                        );
                        const isCompleted = progress?.status === "completed";
                        const isCurrent =
                            activity.number === currentActivityNumber;
                        const isLocked = progress?.status === "locked";
                        const displayIndex = getActivityDisplayIndex(
                            activityNumbers,
                            activity.number,
                        );
                        const isActiveLabel = isCompleted || isCurrent;

                        let circleClass =
                            "bg-white border-2 border-gray-200 text-gray-300";
                        if (isCompleted) {
                            circleClass =
                                "bg-[#34D399] border-transparent text-white shadow-sm scale-110";
                        } else if (isCurrent) {
                            circleClass = `bg-white border-4 ${activeCircleStyle} shadow-lg ring-4 scale-110`;
                        }

                        return (
                            <div
                                key={activity.id}
                                className="flex flex-col items-center gap-3 flex-1 min-w-0 relative group cursor-default"
                            >
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-base duration-500 relative z-10 shrink-0 ${circleClass}`}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-6 h-6" />
                                    ) : isLocked ? (
                                        <Lock className="w-4 h-4" />
                                    ) : (
                                        activityNumbers.indexOf(
                                            activity.number,
                                        ) + 1
                                    )}
                                </div>

                                <div
                                    className={`text-center transition-base duration-300 flex flex-col items-center ${isCurrent ? "scale-105" : ""} ${isActiveLabel ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}
                                >
                                    <span
                                        className={`text-xs font-bold mb-1.5 ${isActiveLabel ? "text-gray-800" : "text-gray-500"}`}
                                    >
                                        กิจกรรมที่ {displayIndex}
                                    </span>

                                    <span
                                        className={`px-2 py-1 rounded-full text-[10px] font-bold mb-1.5 shadow-sm ${
                                            isCompleted
                                                ? "bg-green-100 text-green-700 border border-green-100"
                                                : isCurrent
                                                  ? "border border-amber-100 bg-amber-100 text-amber-700"
                                                  : "bg-gray-100 text-gray-500 border border-gray-100"
                                        }`}
                                    >
                                        {isCompleted
                                            ? "เสร็จแล้ว"
                                            : isCurrent
                                              ? "กำลังทำ"
                                              : "ล็อค"}
                                    </span>

                                    <span
                                        className={`text-[10px] leading-tight line-clamp-2 max-w-[90px] text-center ${isActiveLabel ? "text-gray-600 font-bold" : "text-gray-400"}`}
                                    >
                                        {getActivityLabel(activity.title)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mobile: Vertical Timeline */}
            <div className="md:hidden relative">
                <div className="absolute bottom-5 left-[18px] top-5 z-0 w-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                        className="w-full rounded-full bg-[#34D399] transition-base duration-1000 ease-out"
                        style={{ height: `${progressPercentage}%` }}
                    />
                </div>

                <div className="flex flex-col gap-6">
                    {activities.map((activity) => {
                        const progress = progressByActivityNumber.get(
                            activity.number,
                        );
                        const isCompleted = progress?.status === "completed";
                        const isCurrent =
                            activity.number === currentActivityNumber;
                        const isLocked = progress?.status === "locked";
                        const displayIndex = getActivityDisplayIndex(
                            activityNumbers,
                            activity.number,
                        );
                        const isActiveLabel = isCompleted || isCurrent;

                        let circleClass =
                            "bg-white border-2 border-gray-200 text-gray-300";
                        if (isCompleted) {
                            circleClass =
                                "bg-[#34D399] border-transparent text-white shadow-sm";
                        } else if (isCurrent) {
                            circleClass = `bg-white border-3 ${activeCircleStyle} shadow-md ring-3`;
                        }

                        return (
                            <div
                                key={activity.id}
                                className="flex items-center gap-4 relative"
                            >
                                {/* Circle */}
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold relative z-10 shrink-0 ${circleClass}`}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : isLocked ? (
                                        <Lock className="w-4 h-4" />
                                    ) : (
                                        activityNumbers.indexOf(
                                            activity.number,
                                        ) + 1
                                    )}
                                </div>

                                {/* Label */}
                                <div
                                    className={`flex-1 min-w-0 flex items-center gap-2 ${isActiveLabel ? "opacity-100" : "opacity-60"}`}
                                >
                                    <div className="min-w-0">
                                        <span
                                            className={`text-sm font-bold block ${isActiveLabel ? "text-gray-800" : "text-gray-500"}`}
                                        >
                                            กิจกรรมที่ {displayIndex}:{" "}
                                            <span className="font-medium">
                                                {getActivityLabel(
                                                    activity.title,
                                                )}
                                            </span>
                                        </span>
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                            isCompleted
                                                ? "bg-green-100 text-green-700"
                                                : isCurrent
                                                  ? "bg-yellow-100 text-yellow-700"
                                                  : "bg-gray-100 text-gray-400"
                                        }`}
                                    >
                                        {isCompleted
                                            ? "เสร็จแล้ว"
                                            : isCurrent
                                              ? "กำลังทำ"
                                              : "ล็อค"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
