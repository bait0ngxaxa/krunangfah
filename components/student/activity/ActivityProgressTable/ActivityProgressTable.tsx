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
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 border border-white/60 ring-1 ring-pink-50">
                <p className="text-gray-500 text-center">
                    ไม่สามารถโหลดข้อมูลกิจกรรมได้
                </p>
            </div>
        );
    }

    const progressData = result.data;
    const completedCount = getCompletedCount(progressData);

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 md:p-8 border border-white/60 ring-1 ring-pink-50 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />

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
