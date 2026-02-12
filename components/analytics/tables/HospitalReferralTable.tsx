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
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-6">
            <h2 className="text-xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-6 text-center">
                จำนวนนักเรียนที่ส่งต่อโรงพยาบาล
            </h2>
            <div className="overflow-x-auto rounded-xl border border-pink-100">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="bg-rose-50 border-b-2 border-r border-rose-100 px-6 py-4 text-center font-bold text-rose-700">
                                กลุ่มสีแดง
                            </th>
                            {allGrades.map((grade) => (
                                <th
                                    key={grade}
                                    className="bg-white border-b-2 border-pink-100 px-4 py-4 text-center font-bold text-gray-700 min-w-[80px]"
                                >
                                    {grade}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="bg-rose-50/50 border-r border-rose-100 px-6 py-4 text-center font-bold text-rose-600 whitespace-nowrap">
                                ส่งต่อโรงพยาบาล
                            </td>
                            {allGrades.map((grade) => {
                                const count = referralMap.get(grade) || 0;
                                return (
                                    <td
                                        key={grade}
                                        className="bg-white border-b border-pink-50 px-4 py-4 text-center text-gray-700"
                                    >
                                        {count > 0 ? (
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600 font-bold text-sm">
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
                <div className="text-center text-gray-400 mt-8 py-8 border-t border-pink-50 flex flex-col items-center gap-2">
                    <Hospital className="w-6 h-6 text-gray-400" />
                    <span>ยังไม่มีข้อมูลการส่งต่อโรงพยาบาล</span>
                </div>
            )}
        </div>
    );
}
