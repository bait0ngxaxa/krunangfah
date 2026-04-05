import { Hospital } from "lucide-react";
import type { HospitalReferralByGrade } from "@/lib/actions/analytics/types";

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
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-6 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)]">
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan-200/25 blur-3xl" />
            <h2 className="relative mb-6 text-center text-xl font-extrabold tracking-tight text-slate-800">
                จำนวนนักเรียนที่ส่งต่อโรงพยาบาล
            </h2>
            <div className="relative overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="bg-slate-50 border-b-2 border-r border-slate-200 px-6 py-4 text-center font-bold text-slate-700">
                                กลุ่มสีแดง
                            </th>
                            {allGrades.map((grade) => (
                                <th
                                    key={grade}
                                    className="bg-white border-b-2 border-slate-200 px-4 py-4 text-center font-bold text-slate-700 min-w-[80px]"
                                >
                                    {grade}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="bg-slate-50/50 border-r border-slate-100 px-6 py-4 text-center font-bold text-rose-600 whitespace-nowrap">
                                ส่งต่อโรงพยาบาล
                            </td>
                            {allGrades.map((grade) => {
                                const count = referralMap.get(grade) || 0;
                                return (
                                    <td
                                        key={grade}
                                        className="bg-white border-b border-slate-50 px-4 py-4 text-center text-slate-700"
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
            {hospitalReferralsByGrade.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-2 border-t border-slate-200/70 py-8 text-center text-gray-400">
                    <Hospital className="w-6 h-6 text-gray-400" />
                    <span>ยังไม่มีข้อมูลการส่งต่อโรงพยาบาล</span>
                </div>
            ) : null}
        </div>
    );
}
