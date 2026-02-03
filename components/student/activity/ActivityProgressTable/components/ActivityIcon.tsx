// components/student/activity/ActivityProgressTable/components/ActivityIcon.tsx

import { CheckCircle2 } from "lucide-react";
import type { ActivityIconProps } from "../types";

/**
 * Icon component for activity status indicator
 */
export function ActivityIcon({ status, index, isLocked }: ActivityIconProps) {
    const isCompleted = status === "completed";

    const bgColor = isLocked
        ? "bg-gray-400"
        : isCompleted
          ? "bg-green-500"
          : "bg-purple-500";

    return (
        <span
            className={`w-6 h-6 ${bgColor} text-white rounded-full flex items-center justify-center text-xs font-bold`}
        >
            {isLocked ? (
                "🔒"
            ) : isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
            ) : (
                index + 1
            )}
        </span>
    );
}
