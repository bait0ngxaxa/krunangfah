// components/student/activity/ActivityProgressTable/components/ActivityStatusBadge.tsx

import type { ActivityStatusBadgeProps } from "../types";

/**
 * Badge component for activity status
 */
export function ActivityStatusBadge({ status }: ActivityStatusBadgeProps) {
    const isCompleted = status === "completed";
    const isLocked = status === "locked";

    const badgeClass = isCompleted
        ? "bg-green-100 text-green-700"
        : isLocked
          ? "bg-gray-100 text-gray-500"
          : "bg-yellow-100 text-yellow-700";

    const label = isCompleted
        ? "เสร็จแล้ว"
        : isLocked
          ? "ล็อค"
          : "กำลังทำ";

    return (
        <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}
        >
            {label}
        </span>
    );
}
