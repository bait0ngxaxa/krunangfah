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
                <div className="relative bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-8 flex flex-col items-center justify-center min-h-[400px]">
                    <h2 className="relative text-xl font-bold text-gray-800 mb-4 text-center">
                        กระบวนการช่วยเหลือ (ห้องที่ปรึกษา)
                    </h2>
                    <div className="relative text-gray-400 flex flex-col items-center gap-3">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full bg-emerald-300 blur-lg opacity-20" />
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
        <div className="relative bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6 overflow-hidden mt-6">
            <h2 className="relative text-xl font-extrabold text-slate-800 mb-6 text-center tracking-tight">
                กระบวนการช่วยเหลือ (ห้องที่ปรึกษา)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-700">
                            <th className="px-6 py-4 text-center text-sm font-semibold border-r border-slate-200 whitespace-nowrap">
                                กลุ่มสี
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold border-r border-slate-200 whitespace-nowrap">
                                จำนวนนักเรียน
                                <br />
                                <span className="text-xs font-normal text-slate-500">
                                    (คน)
                                </span>
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold border-r border-slate-200 whitespace-nowrap">
                                ยังไม่ทำกิจกรรม
                            </th>
                            {ACTIVITY_LABELS.map((label, index) => (
                                <th
                                    key={index}
                                    className="px-6 py-4 text-center text-sm font-semibold border-r border-slate-200 last:border-none whitespace-nowrap"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orderedData.map((item) => {
                            const activities = [
                                item.activity1,
                                item.activity2,
                                item.activity3,
                                item.activity4,
                                item.activity5,
                            ];

                            // Determine which activities are required for this risk level
                            const REQUIRED_ACTIVITIES: Record<
                                string,
                                number[]
                            > = {
                                orange: [1, 2, 3, 4, 5],
                                yellow: [1, 2, 3, 5],
                                green: [1, 2, 5],
                                red: [],
                                blue: [],
                            };
                            const requiredForLevel =
                                REQUIRED_ACTIVITIES[item.riskLevel] || [];
                            const hasActivities = requiredForLevel.length > 0;

                            return (
                                <tr
                                    key={item.riskLevel}
                                    className="hover:bg-slate-50/50 transition-colors"
                                >
                                    {/* Risk Level */}
                                    <td
                                        className="px-4 py-3 text-center font-bold border-r border-slate-200 bg-white"
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
                                    <td className="px-4 py-3 text-center font-bold text-slate-800 border-r border-slate-200 text-lg bg-white">
                                        {item.totalStudents}
                                    </td>

                                    {/* No Activity Column */}
                                    <td
                                        className={`px-4 py-3 text-center border-r border-slate-300 ${
                                            !hasActivities
                                                ? "bg-slate-200" // Not required: darker background
                                                : item.noActivity > 0
                                                  ? "bg-red-50/70" // Required & has value
                                                  : "bg-white" // Required & empty state
                                        }`}
                                    >
                                        {hasActivities &&
                                        item.noActivity > 0 ? (
                                            <span className="font-bold text-red-500">
                                                {item.noActivity}
                                            </span>
                                        ) : null}
                                    </td>

                                    {/* Activities 1-5 */}
                                    {activities.map((count, index) => {
                                        const activityNumber = index + 1;
                                        const isRequired =
                                            requiredForLevel.includes(
                                                activityNumber,
                                            );

                                        return (
                                            <td
                                                key={index}
                                                className={`px-4 py-3 text-center border-r border-slate-300 last:border-none ${
                                                    !isRequired
                                                        ? "bg-slate-200" // Not required: darker background
                                                        : "bg-white" // Required: white background (even if empty)
                                                }`}
                                            >
                                                {isRequired && count > 0 ? (
                                                    <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-sm border border-emerald-100">
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
