"use client";

import type { RiskLevelSummary } from "@/lib/actions/analytics";

interface PhqSummaryTableProps {
    riskLevelSummary: RiskLevelSummary[];
}

export function PhqSummaryTable({ riskLevelSummary }: PhqSummaryTableProps) {
    // Order: red, orange, yellow, green, blue
    const orderedLevels = ["red", "orange", "yellow", "green", "blue"];
    const orderedSummary = orderedLevels
        .map((level) =>
            riskLevelSummary.find((item) => item.riskLevel === level),
        )
        .filter((item): item is RiskLevelSummary => item !== undefined);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
                ผลการคัดกรอง PHQ-A
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-blue-50 border-b-2 border-blue-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                จากนักเรียนที่คัด
                                <br />
                                กรองได้ทั้งหมด
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">
                                จำนวน (คน)
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                สั่งต่อโรงพยาบาล
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderedSummary.map((item) => {
                            return (
                                <tr
                                    key={item.riskLevel}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                    style={{
                                        backgroundColor:
                                            item.count > 0
                                                ? `${item.color}15`
                                                : "transparent",
                                    }}
                                >
                                    <td
                                        className="px-4 py-3 text-sm font-medium"
                                        style={{ color: item.color }}
                                    >
                                        {item.label}
                                    </td>
                                    <td className="px-4 py-3 text-center text-2xl font-semibold text-gray-800">
                                        {item.count}
                                    </td>
                                    <td className="px-4 py-3 text-center text-2xl font-semibold text-gray-800">
                                        {item.referralCount}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
