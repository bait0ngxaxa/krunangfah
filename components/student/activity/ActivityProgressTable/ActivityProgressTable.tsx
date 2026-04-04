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
    readOnly = false,
}: ActivityProgressTableProps) {
    const activityNumbers = getActivityNumbers(riskLevel);

    if (activityNumbers.length === 0) {
        return null;
    }

    const result = await getActivityProgress(studentId, phqResultId);

    if (!result.success || !result.data) {
        return (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-gray-500 text-center">
                    ไม่สามารถโหลดข้อมูลกิจกรรมได้
                </p>
            </div>
        );
    }

    const progressData = result.data;
    const completedCount = getCompletedCount(progressData);

    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm transition-base duration-300 hover:shadow-md md:p-8">
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-100/40 blur-3xl" />
            <ActivityProgressHeader
                studentId={studentId}
                phqResultId={phqResultId}
                riskLevel={riskLevel}
                completedCount={completedCount}
                totalCount={activityNumbers.length}
                assessmentPeriod={assessmentPeriod}
                readOnly={readOnly}
            />

            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                <table className="w-full">
                    <thead className="hidden md:table-header-group">
                        <tr className="border-b border-gray-200 bg-slate-50/90 text-gray-700">
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

                    <tbody className="block divide-y divide-gray-100 md:table-row-group">
                        {progressData.map((progress, index) => (
                            <ActivityRow
                                key={progress.id}
                                progress={progress}
                                index={index}
                                readOnly={readOnly}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
