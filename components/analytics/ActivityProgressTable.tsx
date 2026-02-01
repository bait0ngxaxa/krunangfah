"use client";

import type { ActivityProgressByRisk } from "@/lib/actions/analytics.actions";

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

export function ActivityProgressTable({
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
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    กระบวนการช่วยเหลือ (ห้องที่ปรึกษา)
                </h2>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    ยังไม่มีข้อมูลการคัดกรอง
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                กระบวนการช่วยเหลือ (ห้องที่ปรึกษา)
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-linear-to-r from-indigo-600 to-purple-600 text-white">
                            <th className="px-4 py-3 text-center text-sm font-semibold border border-indigo-500">
                                กลุ่มสี
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold border border-indigo-500">
                                จำนวนนักเรียน
                                <br />
                                (คน)
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold border border-indigo-500">
                                ยังไม่ทำกิจกรรม
                            </th>
                            {ACTIVITY_LABELS.map((label, index) => (
                                <th
                                    key={index}
                                    className="px-4 py-3 text-center text-sm font-semibold border border-indigo-500"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {orderedData.map((item) => {
                            const activities = [
                                item.activity1,
                                item.activity2,
                                item.activity3,
                                item.activity4,
                                item.activity5,
                            ];

                            return (
                                <tr key={item.riskLevel} className="border">
                                    {/* Risk Level */}
                                    <td
                                        className="px-4 py-3 text-center font-bold border border-gray-300"
                                        style={{
                                            backgroundColor: item.color,
                                            color:
                                                item.riskLevel === "yellow"
                                                    ? "#000"
                                                    : "#fff",
                                        }}
                                    >
                                        {item.label.split(" ")[0]}{" "}
                                        {/* Just the color name */}
                                    </td>

                                    {/* Total Students */}
                                    <td
                                        className="px-4 py-3 text-center font-bold text-lg border border-gray-300"
                                        style={{
                                            backgroundColor: `${item.color}30`,
                                        }}
                                    >
                                        {item.totalStudents}
                                    </td>

                                    {/* No Activity */}
                                    <td
                                        className={`px-4 py-3 text-center font-semibold border border-gray-300 ${
                                            item.noActivity === 0
                                                ? "bg-gray-400"
                                                : "bg-white"
                                        }`}
                                    >
                                        {item.noActivity > 0
                                            ? item.noActivity
                                            : ""}
                                    </td>

                                    {/* Activities 1-5 */}
                                    {activities.map((count, index) => {
                                        const isEmpty = count === 0;
                                        return (
                                            <td
                                                key={index}
                                                className={`px-4 py-3 text-center font-semibold border border-gray-300 ${
                                                    isEmpty
                                                        ? "bg-gray-400"
                                                        : "bg-white"
                                                }`}
                                            >
                                                {count > 0 ? count : ""}
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
