"use client";

import { Hospital } from "lucide-react";
import type { HospitalReferralByGrade } from "@/lib/actions/analytics";

interface HospitalReferralTableProps {
    hospitalReferralsByGrade: HospitalReferralByGrade[];
}

export function HospitalReferralTable({
    hospitalReferralsByGrade,
}: HospitalReferralTableProps) {
    // Get all unique grades and sort them
    const allGrades = hospitalReferralsByGrade
        .map((item) => item.grade)
        .sort((a, b) => {
            const gradeA = parseInt(a.match(/\d+/)?.[0] || "0");
            const gradeB = parseInt(b.match(/\d+/)?.[0] || "0");
            return gradeA - gradeB;
        });

    // Create a map for quick lookup
    const referralMap = new Map(
        hospitalReferralsByGrade.map((item) => [
            item.grade,
            item.referralCount,
        ]),
    );

    return (
        <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(16,185,129,0.15)] border border-emerald-200 ring-1 ring-white/80 p-6 overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-emerald-200/40 to-green-300/30 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />

            <h2 className="relative text-xl font-bold bg-linear-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-6 text-center">
                จำนวนนักเรียนที่ส่งต่อโรงพยาบาล
            </h2>
            <div className="overflow-x-auto rounded-xl border border-emerald-100">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="bg-emerald-50 border-b-2 border-r border-emerald-100 px-6 py-4 text-center font-bold text-emerald-700">
                                กลุ่มสีแดง
                            </th>
                            {allGrades.map((grade) => (
                                <th
                                    key={grade}
                                    className="bg-white border-b-2 border-emerald-100 px-4 py-4 text-center font-bold text-gray-700 min-w-[80px]"
                                >
                                    {grade}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="bg-emerald-50/50 border-r border-emerald-100 px-6 py-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                                ส่งต่อโรงพยาบาล
                            </td>
                            {allGrades.map((grade) => {
                                const count = referralMap.get(grade) || 0;
                                return (
                                    <td
                                        key={grade}
                                        className="bg-white border-b border-emerald-50 px-4 py-4 text-center text-gray-700"
                                    >
                                        {count > 0 ? (
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm">
                                                {count}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">
                                                -
                                            </span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
            {hospitalReferralsByGrade.length === 0 && (
                <div className="text-center text-gray-400 mt-8 py-8 border-t border-emerald-50 flex flex-col items-center gap-2">
                    <Hospital className="w-6 h-6 text-gray-400" />
                    <span>ยังไม่มีข้อมูลการส่งต่อโรงพยาบาล</span>
                </div>
            )}
        </div>
    );
}
