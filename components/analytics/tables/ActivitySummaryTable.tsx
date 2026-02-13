"use client";

import { ClipboardList } from "lucide-react";
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
                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-8 flex flex-col items-center justify-center min-h-[400px] overflow-hidden">
                    {/* Decorations */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-rose-200/25 to-pink-300/20 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-linear-to-br from-pink-200/20 to-rose-300/15 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

                    <h2 className="relative text-xl font-bold text-gray-800 mb-4 text-center">
                        กระบวนการช่วยเหลือ (ห้องที่ปรึกษา)
                    </h2>
                    <div className="relative text-gray-400 flex flex-col items-center gap-3">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full bg-pink-300 blur-lg opacity-20" />
                            <div className="relative w-full h-full bg-gray-50 rounded-full flex items-center justify-center ring-1 ring-gray-100">
                                <ClipboardList className="w-8 h-8 text-gray-400" />
                            </div>
                        </div>
                        <span>ยังไม่มีข้อมูลกระบวนการช่วยเหลือ</span>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-6 overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

            <h2 className="relative text-xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-6 text-center">
                กระบวนการช่วยเหลือ (ห้องที่ปรึกษา)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-pink-100">
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
