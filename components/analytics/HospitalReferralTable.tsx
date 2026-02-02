"use client";

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
                จำนวนนักเรียนที่ส่งต่อโรงพยาบาล
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="bg-red-100 border border-red-300 px-4 py-3 text-center font-bold text-gray-800">
                                กลุ่มสีแดง
                            </th>
                            {allGrades.map((grade) => (
                                <th
                                    key={grade}
                                    className="bg-red-100 border border-red-300 px-4 py-3 text-center font-bold text-gray-800"
                                >
                                    {grade}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="bg-red-50 border border-red-200 px-4 py-3 text-center font-semibold text-gray-700">
                                ส่งต่อโรงพยาบาล
                            </td>
                            {allGrades.map((grade) => (
                                <td
                                    key={grade}
                                    className="bg-white border border-gray-200 px-4 py-3 text-center text-gray-800"
                                >
                                    {referralMap.get(grade) || 0}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
            {hospitalReferralsByGrade.length === 0 && (
                <div className="text-center text-gray-500 mt-4">
                    ยังไม่มีข้อมูลการส่งต่อโรงพยาบาล
                </div>
            )}
        </div>
    );
}
