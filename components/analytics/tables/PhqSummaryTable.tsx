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
        <div className="relative bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6 overflow-hidden">
            <h2 className="relative text-xl font-extrabold text-slate-800 mb-6 text-center tracking-tight">
                ผลการคัดกรอง PHQ-A
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                                จากนักเรียนที่คัด
                                <br />
                                กรองได้ทั้งหมด
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-slate-700 w-32">
                                จำนวน (คน)
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                                สั่งต่อโรงพยาบาล
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orderedSummary.map((item) => {
                            return (
                                <tr
                                    key={item.riskLevel}
                                    className="hover:bg-cyan-50/50 transition-colors"
                                    style={{
                                        backgroundColor:
                                            item.count > 0
                                                ? `${item.color}08`
                                                : "transparent",
                                    }}
                                >
                                    <td
                                        className="px-6 py-4 text-sm font-bold flex items-center gap-2"
                                        style={{ color: item.color }}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full shadow-sm"
                                            style={{
                                                backgroundColor: item.color,
                                            }}
                                        />
                                        {item.label}
                                    </td>
                                    <td className="px-6 py-4 text-center text-xl font-bold text-gray-800">
                                        {item.count}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.referralCount > 0 ? (
                                            <span className="inline-flex items-center justify-center min-w-8 h-8 px-3 rounded-full bg-cyan-100 text-[#09B8C0] font-bold text-sm shadow-sm">
                                                {item.referralCount}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 font-medium">
                                                -
                                            </span>
                                        )}
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
