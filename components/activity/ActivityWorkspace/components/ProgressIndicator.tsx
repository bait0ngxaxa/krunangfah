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
    const completedCount = activities.filter(
        (a) =>
            activityProgress.find((p) => p.activityNumber === a.number)
                ?.status === "completed",
    ).length;
    const progressPercentage = (completedCount / (activities.length - 1)) * 100;
    const activeCircleStyle = getRiskLevelConfig(riskLevel).circleActive;

    return (
        <div className="mb-10 bg-white rounded-2xl p-6 sm:p-8 border-2 border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold mb-8 sm:mb-10 flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#0BD0D9] flex items-center justify-center text-white shadow-sm shadow-cyan-100">
                    <BarChart3 className="w-6 h-6" />
                </div>
                <span className="text-gray-900">ความคืบหน้า</span>
            </h3>

            {/* Desktop: Horizontal Timeline (md+) */}
            <div className="hidden md:block relative">
                {/* Background Line */}
                <div className="absolute top-[17px] left-0 w-full h-1.5 bg-gray-100 rounded-full z-0" />

                {/* Progress Line */}
                <div
                    className="absolute top-[17px] left-0 h-1.5 bg-[#34D399] rounded-full z-0 transition-all duration-1000 ease-out shadow-sm"
                    style={{ width: `${progressPercentage}%` }}
                />

                <div className="flex justify-between items-start">
                    {activities.map((activity) => {
                        const progress = activityProgress.find(
                            (p) => p.activityNumber === activity.number,
                        );
                        const isCompleted = progress?.status === "completed";
                        const isCurrent =
                            activity.number === currentActivityNumber;
                        const isLocked = progress?.status === "locked";

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
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 relative z-10 shrink-0 ${circleClass}`}
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
                                    className={`text-center transition-all duration-300 flex flex-col items-center ${isCurrent ? "scale-105" : "opacity-60 group-hover:opacity-100"}`}
                                >
                                    <span
                                        className={`text-xs font-bold mb-1.5 ${isCurrent ? "text-gray-800" : "text-gray-500"}`}
                                    >
                                        กิจกรรมที่{" "}
                                        {activityNumbers.indexOf(
                                            activity.number,
                                        ) + 1}
                                    </span>

                                    <span
                                        className={`px-2 py-1 rounded-full text-[10px] font-bold mb-1.5 shadow-sm ${
                                            isCompleted
                                                ? "bg-green-100 text-green-700 border border-green-100"
                                                : isCurrent
                                                  ? "bg-yellow-100 text-yellow-700 border border-yellow-100"
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
                                        className={`text-[10px] leading-tight line-clamp-2 max-w-[90px] text-center ${isCurrent ? "text-gray-600 font-bold" : "text-gray-400"}`}
                                    >
                                        {activity.title.split(": ")[1] ||
                                            activity.title}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mobile: Vertical Timeline */}
            <div className="md:hidden relative">
                {/* Vertical Background Line */}
                <div className="absolute top-0 left-[18px] w-1 h-full bg-gray-100 rounded-full z-0" />

                {/* Vertical Progress Line */}
                <div
                    className="absolute top-0 left-[18px] w-1 bg-[#34D399] rounded-full z-0 transition-all duration-1000 ease-out"
                    style={{ height: `${progressPercentage}%` }}
                />

                <div className="flex flex-col gap-6">
                    {activities.map((activity) => {
                        const progress = activityProgress.find(
                            (p) => p.activityNumber === activity.number,
                        );
                        const isCompleted = progress?.status === "completed";
                        const isCurrent =
                            activity.number === currentActivityNumber;
                        const isLocked = progress?.status === "locked";

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
                                    className={`flex-1 min-w-0 flex items-center gap-2 ${isCurrent ? "" : "opacity-60"}`}
                                >
                                    <div className="min-w-0">
                                        <span
                                            className={`text-sm font-bold block ${isCurrent ? "text-gray-800" : "text-gray-500"}`}
                                        >
                                            กิจกรรมที่{" "}
                                            {activityNumbers.indexOf(
                                                activity.number,
                                            ) + 1}
                                            :{" "}
                                            <span className="font-medium">
                                                {activity.title.split(
                                                    ": ",
                                                )[1] || activity.title}
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
