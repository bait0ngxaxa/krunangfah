import { FileText, CheckCircle2 } from "lucide-react";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { getActivityProgress } from "@/lib/actions/activity";
import Link from "next/link";
import { WorksheetPreviewButton } from "./WorksheetPreviewButton";

// Activity configuration
const ACTIVITIES = [
    { id: "a1", name: "รู้จักตัวเอง", number: 1 },
    { id: "a2", name: "ค้นหาคุณค่าที่ฉันมี", number: 2 },
    { id: "a3", name: "ปรับความคิด ชีวิตเปลี่ยน", number: 3 },
    { id: "a4", name: "รู้จักตัวกระตุ้น", number: 4 },
    { id: "a5", name: "ตามติดเพื่อไปต่อ", number: 5 },
];

const ACTIVITY_INDICES: Record<string, number[]> = {
    orange: [1, 2, 3, 4, 5],
    yellow: [1, 2, 3, 5],
    green: [1, 2, 5],
};

interface ActivityProgressTableProps {
    studentId: string;
    phqResultId: string;
    riskLevel: RiskLevel;
}

export async function ActivityProgressTable({
    studentId,
    phqResultId,
    riskLevel,
}: ActivityProgressTableProps) {
    const activityNumbers = ACTIVITY_INDICES[riskLevel] || [];

    // Don't show for red/blue
    if (activityNumbers.length === 0) {
        return null;
    }

    // Fetch real data from database
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
    const completedCount = progressData.filter(
        (p) => p.status === "completed",
    ).length;

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-purple-500 to-pink-500" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                            กิจกรรมช่วยเหลือนักเรียนกลุ่มสี
                            {riskLevel === "orange"
                                ? "ส้ม"
                                : riskLevel === "yellow"
                                  ? "เหลือง"
                                  : "เขียว"}
                        </h2>
                        <p className="text-gray-600 text-sm">
                            เสร็จแล้ว {completedCount}/{activityNumbers.length}{" "}
                            กิจกรรม
                        </p>
                    </div>
                </div>
                <Link
                    href={`/students/${studentId}/help/start`}
                    className="px-4 py-2 bg-purple-500 text-white rounded-full text-sm font-medium hover:bg-purple-600 transition-colors"
                >
                    ทำกิจกรรม
                </Link>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-linear-to-r from-indigo-600 to-purple-600 text-white">
                            <th className="px-4 py-3 text-left rounded-tl-xl">
                                กิจกรรมที่ต้องทำ
                            </th>
                            <th className="px-4 py-3 text-left">
                                วันที่นัดหมาย
                            </th>
                            <th className="px-4 py-3 text-left">
                                ครูผู้ทำกิจกรรม
                            </th>
                            <th className="px-4 py-3 text-center rounded-tr-xl">
                                สถานะ
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {progressData.map((progress, index) => {
                            const activity = ACTIVITIES.find(
                                (a) => a.number === progress.activityNumber,
                            );
                            const isLocked = progress.status === "locked";
                            const isCompleted = progress.status === "completed";

                            return (
                                <tr
                                    key={progress.id}
                                    className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                                        index % 2 === 0
                                            ? "bg-white"
                                            : "bg-gray-50"
                                    } ${isLocked ? "opacity-60" : ""}`}
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-6 h-6 ${
                                                    isLocked
                                                        ? "bg-gray-400"
                                                        : isCompleted
                                                          ? "bg-green-500"
                                                          : "bg-purple-500"
                                                } text-white rounded-full flex items-center justify-center text-xs font-bold`}
                                            >
                                                {isLocked ? (
                                                    "🔒"
                                                ) : isCompleted ? (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                ) : (
                                                    index + 1
                                                )}
                                            </span>
                                            <span
                                                className={`font-medium ${
                                                    isLocked
                                                        ? "text-gray-400"
                                                        : "text-gray-800"
                                                }`}
                                            >
                                                {activity?.name ||
                                                    `กิจกรรมที่ ${progress.activityNumber}`}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {progress.scheduledDate ? (
                                            <span className="text-gray-700">
                                                {new Date(
                                                    progress.scheduledDate,
                                                ).toLocaleDateString("th-TH")}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic">
                                                ยังไม่ได้นัดหมาย
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-gray-700">
                                            {progress.teacher?.teacher
                                                ? `${progress.teacher.teacher.firstName} ${progress.teacher.teacher.lastName}`
                                                : "ยังไม่ได้กำหนด"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {isLocked ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                ล็อค
                                            </span>
                                        ) : (
                                            <WorksheetPreviewButton
                                                uploads={
                                                    progress.worksheetUploads
                                                }
                                                isCompleted={isCompleted}
                                            />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {progressData.map((progress, index) => {
                    const activity = ACTIVITIES.find(
                        (a) => a.number === progress.activityNumber,
                    );
                    const isLocked = progress.status === "locked";
                    const isCompleted = progress.status === "completed";

                    return (
                        <div
                            key={progress.id}
                            className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm ${
                                isLocked ? "opacity-60" : ""
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className={`w-8 h-8 ${
                                        isLocked
                                            ? "bg-gray-400"
                                            : isCompleted
                                              ? "bg-green-500"
                                              : "bg-purple-500"
                                    } text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}
                                >
                                    {isLocked ? (
                                        "🔒"
                                    ) : isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                    ) : (
                                        index + 1
                                    )}
                                </span>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <p
                                            className={`font-medium ${
                                                isLocked
                                                    ? "text-gray-400"
                                                    : "text-gray-800"
                                            }`}
                                        >
                                            {activity?.name ||
                                                `กิจกรรมที่ ${progress.activityNumber}`}
                                        </p>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                isCompleted
                                                    ? "bg-green-100 text-green-700"
                                                    : isLocked
                                                      ? "bg-gray-100 text-gray-500"
                                                      : "bg-yellow-100 text-yellow-700"
                                            }`}
                                        >
                                            {isCompleted
                                                ? "เสร็จแล้ว"
                                                : isLocked
                                                  ? "ล็อค"
                                                  : "กำลังทำ"}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <p>
                                            <span className="font-medium">
                                                วันที่:
                                            </span>{" "}
                                            {progress.scheduledDate
                                                ? new Date(
                                                      progress.scheduledDate,
                                                  ).toLocaleDateString("th-TH")
                                                : "ยังไม่ได้นัดหมาย"}
                                        </p>
                                        <p>
                                            <span className="font-medium">
                                                ครู:
                                            </span>{" "}
                                            {progress.teacher?.teacher
                                                ? `${progress.teacher.teacher.firstName} ${progress.teacher.teacher.lastName}`
                                                : "ยังไม่ได้กำหนด"}
                                        </p>
                                        {isCompleted &&
                                            progress.worksheetUploads.length >
                                                0 && (
                                                <div className="mt-2">
                                                    <WorksheetPreviewButton
                                                        uploads={
                                                            progress.worksheetUploads
                                                        }
                                                        isCompleted={
                                                            isCompleted
                                                        }
                                                    />
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
