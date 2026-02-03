// components/student/activity/ActivityProgressTable/ActivityProgressTable.tsx

import { getActivityProgress } from "@/lib/actions/activity";
import type { ActivityProgressTableProps } from "./types";
import { getActivityNumbers, getCompletedCount } from "./utils";
import { TableHeader, DesktopTable, MobileCards } from "./components";

/**
 * Main Server Component for Activity Progress Table
 * Displays student activity progress in both desktop table and mobile card views
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

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-purple-500 to-pink-500" />

            <TableHeader
                studentId={studentId}
                riskLevel={riskLevel}
                completedCount={completedCount}
                totalCount={activityNumbers.length}
            />

            <DesktopTable progressData={progressData} />

            <MobileCards progressData={progressData} />
        </div>
    );
}
