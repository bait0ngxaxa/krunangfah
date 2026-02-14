import { getActivityProgress } from "@/lib/actions/activity";
import type { ActivityProgressTableProps } from "./types";
import { getActivityNumbers, getCompletedCount } from "./utils";
import { ActivityProgressHeader } from "./ActivityProgressHeader";
import { ActivityRow } from "./ActivityRow";

/**
 * Server Component — fetches data and composes sub-components
 */
export async function ActivityProgressTable({
    studentId,
    phqResultId,
    riskLevel,
    assessmentPeriod,
}: ActivityProgressTableProps) {
    const activityNumbers = getActivityNumbers(riskLevel);

    if (activityNumbers.length === 0) {
        return null;
    }

    const result = await getActivityProgress(studentId, phqResultId);

    if (!result.success || !result.data) {
        return (
            <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 border border-pink-200 ring-1 ring-pink-50 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-rose-200/40 to-pink-300/30 rounded-full blur-xl pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />
                <p className="relative text-gray-500 text-center">
                    ไม่สามารถโหลดข้อมูลกิจกรรมได้
                </p>
            </div>
        );
    }

    const progressData = result.data;
    const completedCount = getCompletedCount(progressData);

    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 md:p-8 border border-pink-200 ring-1 ring-pink-50 overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />
            {/* Corner decoration */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-linear-to-br from-rose-200/45 to-pink-300/35 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-[6px] h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

            <ActivityProgressHeader
                studentId={studentId}
                phqResultId={phqResultId}
                riskLevel={riskLevel}
                completedCount={completedCount}
                totalCount={activityNumbers.length}
                assessmentPeriod={assessmentPeriod}
            />

            <div className="overflow-x-auto rounded-xl border border-pink-100">
                <table className="w-full">
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
