"use client";

import type { ActivityProgressByRisk } from "@/lib/actions/analytics";

interface ActivityProgressTableProps {
    activityProgressByRisk: ActivityProgressByRisk[];
}

const ACTIVITY_LABELS = [
    "รู้จักตัวเอง",
    "ค้นหาคุณค่าที่ตัวฉันมี",
    "ปรับความคิดชีวิตเปลี่ยน",
    "รู้จักตัวกระตุ้น",
    "ตามติดเพื่อไปต่อ",
];

export function ActivitySummaryTable({
    activityProgressByRisk,
}: ActivityProgressTableProps) {
    // Order: red, orange, yellow, green, blue
    const orderedLevels = ["red", "orange", "yellow", "green", "blue"];
    const orderedData = orderedLevels
        .map((level) =>
            activityProgressByRisk.find((item) => item.riskLevel === level),
        )
        .filter((item): item is ActivityProgressByRisk => item !== undefined);

    if (orderedData.length === 0) {
        if (orderedData.length === 0) {
            return (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-8 flex flex-col items-center justify-center min-h-[400px]">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                        กระบวนการช่วยเหลือ (ห้องที่ปรึกษา)
                    </h2>
                    <div className="text-gray-400 flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                            <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <span>ยังไม่มีข้อมูลกระบวนการช่วยเหลือ</span>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-6 overflow-hidden">
            <h2 className="text-xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-6 text-center">
                กระบวนการช่วยเหลือ (ห้องที่ปรึกษา)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-300">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-linear-to-r from-pink-500 via-rose-400 to-orange-400 text-white">
                            <th className="px-6 py-4 text-center text-sm font-bold border-r border-white/30 whitespace-nowrap">
                                กลุ่มสี
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold border-r border-white/30 whitespace-nowrap">
                                จำนวนนักเรียน
                                <br />
                                (คน)
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold border-r border-white/30 whitespace-nowrap bg-gray-50/10 text-white/90">
                                ยังไม่ทำกิจกรรม
                            </th>
                            {ACTIVITY_LABELS.map((label, index) => (
                                <th
                                    key={index}
                                    className="px-6 py-4 text-center text-sm font-bold border-r border-white/30 last:border-none whitespace-nowrap"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                        {orderedData.map((item) => {
                            const activities = [
                                item.activity1,
                                item.activity2,
                                item.activity3,
                                item.activity4,
                                item.activity5,
                            ];

                            return (
                                <tr
                                    key={item.riskLevel}
                                    className="hover:bg-pink-50/30 transition-colors"
                                >
                                    {/* Risk Level */}
                                    <td
                                        className="px-4 py-3 text-center font-bold border-r border-gray-300"
                                        style={{ color: item.color }}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <span
                                                className="w-3 h-3 rounded-full shadow-sm"
                                                style={{
                                                    backgroundColor: item.color,
                                                }}
                                            />
                                            {item.label.split(" ")[0]}
                                        </div>
                                    </td>

                                    {/* Total Students */}
                                    <td className="px-4 py-3 text-center font-bold text-gray-800 border-r border-gray-300 text-lg">
                                        {item.totalStudents}
                                    </td>

                                    {/* No Activity */}
                                    <td
                                        className={`px-4 py-3 text-center border-r border-gray-300 ${
                                            item.noActivity > 0
                                                ? "bg-red-50/50"
                                                : "bg-gray-100/80"
                                        }`}
                                    >
                                        {item.noActivity > 0 ? (
                                            <span className="font-bold text-red-500">
                                                {item.noActivity}
                                            </span>
                                        ) : null}
                                    </td>

                                    {/* Activities 1-5 */}
                                    {activities.map((count, index) => {
                                        return (
                                            <td
                                                key={index}
                                                className={`px-4 py-3 text-center border-r border-gray-300 last:border-none ${
                                                    count === 0
                                                        ? "bg-gray-100/80"
                                                        : ""
                                                }`}
                                            >
                                                {count > 0 ? (
                                                    <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-green-50 text-green-600 font-bold text-sm border border-green-100">
                                                        {count}
                                                    </span>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
