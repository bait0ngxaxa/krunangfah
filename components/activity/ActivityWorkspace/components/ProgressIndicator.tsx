import { CheckCircle2, Lock } from "lucide-react";
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

    const colorMap: Record<string, string> = {
        orange: "border-orange-500 text-orange-600 ring-orange-100",
        yellow: "border-yellow-400 text-yellow-600 ring-yellow-100",
        green: "border-green-500 text-green-600 ring-green-100",
    };

    return (
        <div className="mb-10 bg-white/60 backdrop-blur-md rounded-2xl p-8 border border-white/80 shadow-lg shadow-pink-50/50">
            <h3 className="text-xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-10 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                ความคืบหน้า
            </h3>
            <div className="relative">
                {/* Background Line */}
                <div className="absolute top-4 left-0 w-full h-1.5 bg-gray-100 rounded-full -z-10" />

                {/* Progress Line */}
                <div
                    className="absolute top-4 left-0 h-1.5 bg-linear-to-r from-green-400 to-emerald-500 rounded-full -z-10 transition-all duration-1000 ease-out shadow-sm"
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

                        // Determine circle style
                        let circleClass =
                            "bg-white border-2 border-gray-200 text-gray-300";
                        if (isCompleted) {
                            circleClass =
                                "bg-linear-to-br from-green-400 to-emerald-500 border-transparent text-white shadow-lg shadow-green-200 scale-110";
                        } else if (isCurrent) {
                            const activeStyle =
                                colorMap[riskLevel] ||
                                "border-gray-500 text-gray-600 ring-gray-100";
                            circleClass = `bg-white border-4 ${activeStyle} shadow-lg ring-4 scale-110`;
                        }

                        return (
                            <div
                                key={activity.id}
                                className="flex flex-col items-center gap-4 w-1/5 relative group cursor-default"
                            >
                                {/* Circle */}
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 z-10 ${circleClass}`}
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

                                {/* Label */}
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

                                    {/* Status Badge */}
                                    <span
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5 shadow-sm ${
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
                                        className={`text-[10px] md:text-xs leading-tight line-clamp-2 max-w-[80px] md:max-w-full text-center ${isCurrent ? "text-gray-600 font-bold" : "text-gray-400"}`}
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
        </div>
    );
}
