"use client";

import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { formatAcademicYear } from "@/lib/utils/academic-year";
import { AlertTriangle } from "lucide-react";

interface PHQResult {
    id: string;
    totalScore: number;
    riskLevel: string;
    createdAt: Date;
    q9a: boolean;
    q9b: boolean;
    academicYear: {
        year: number;
        semester: number;
    };
}

interface PHQHistoryTableProps {
    results: PHQResult[];
}

const riskConfig: Record<
    RiskLevel,
    { label: string; bgColor: string; textColor: string }
> = {
    blue: {
        label: "ไม่มีความเสี่ยง",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
    },
    green: {
        label: "เสี่ยงน้อย",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
    },
    orange: {
        label: "เสี่ยงสูง",
        bgColor: "bg-orange-100",
        textColor: "text-orange-700",
    },
    red: {
        label: "เสี่ยงสูงมาก",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
    },
};

export function PHQHistoryTable({ results }: PHQHistoryTableProps) {
    if (results.length === 0) {
        return (
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8 border border-white/50 text-center">
                <p className="text-gray-500">ยังไม่มีประวัติการคัดกรอง</p>
            </div>
        );
    }

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-pink-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />

            <h2 className="text-2xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                <span className="text-2xl filter drop-shadow-sm">📋</span>
                ประวัติการคัดกรองสุขภาพจิต
            </h2>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-pink-100">
                <table className="w-full">
                    <thead>
                        <tr className="bg-pink-50/80 border-b border-pink-200">
                            <th className="text-left py-4 px-6 font-bold text-gray-700">
                                ครั้งที่
                            </th>
                            <th className="text-left py-4 px-6 font-bold text-gray-700">
                                วันที่
                            </th>
                            <th className="text-left py-4 px-6 font-bold text-gray-700">
                                ปีการศึกษา/เทอม
                            </th>
                            <th className="text-center py-4 px-6 font-bold text-gray-700">
                                คะแนนรวม
                            </th>
                            <th className="text-left py-4 px-6 font-bold text-gray-700">
                                ระดับความเสี่ยง
                            </th>
                            <th className="text-center py-4 px-6 font-bold text-gray-700">
                                หมายเหตุ
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-pink-50">
                        {results.map((result, index) => {
                            const risk =
                                riskConfig[result.riskLevel as RiskLevel];
                            const hasWarning = result.q9a || result.q9b;

                            return (
                                <tr
                                    key={result.id}
                                    className="hover:bg-pink-50/30 transition-colors"
                                >
                                    <td className="py-4 px-6 font-medium text-gray-700">
                                        {results.length - index}
                                    </td>
                                    <td className="py-4 px-6 text-gray-600">
                                        {new Date(
                                            result.createdAt,
                                        ).toLocaleDateString("th-TH", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </td>
                                    <td className="py-4 px-6 text-gray-600">
                                        {formatAcademicYear(
                                            result.academicYear.year,
                                            result.academicYear.semester,
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-center font-bold text-gray-800">
                                        {result.totalScore}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-sm font-bold shadow-sm ${risk.bgColor} ${risk.textColor}`}
                                        >
                                            {risk.label}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {hasWarning && (
                                            <div
                                                className="inline-flex items-center justify-center gap-1 text-rose-500 bg-rose-50 w-8 h-8 rounded-full"
                                                title={
                                                    result.q9a && result.q9b
                                                        ? "มีความคิดทำร้ายตัวเองและผู้อื่น"
                                                        : result.q9a
                                                          ? "มีความคิดทำร้ายตัวเอง"
                                                          : "มีความคิดทำร้ายผู้อื่น"
                                                }
                                            >
                                                <AlertTriangle className="w-5 h-5" />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {results.map((result, index) => {
                    const risk = riskConfig[result.riskLevel as RiskLevel];
                    const hasWarning = result.q9a || result.q9b;

                    return (
                        <div
                            key={result.id}
                            className="p-5 bg-white rounded-2xl border border-pink-100 shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-sm text-pink-500 font-medium mb-1">
                                        ครั้งที่ {results.length - index}
                                    </div>
                                    <div className="font-bold text-gray-800">
                                        {new Date(
                                            result.createdAt,
                                        ).toLocaleDateString("th-TH", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </div>
                                </div>
                                {hasWarning && (
                                    <div className="p-2 bg-rose-50 text-rose-500 rounded-full">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-300" />
                                    {formatAcademicYear(
                                        result.academicYear.year,
                                        result.academicYear.semester,
                                        "long",
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <span className="text-sm text-gray-600 font-medium">
                                        คะแนนรวม
                                    </span>
                                    <span className="font-bold text-gray-900 text-lg">
                                        {result.totalScore}
                                    </span>
                                </div>
                                <div>
                                    <span
                                        className={`inline-block px-4 py-2 rounded-xl text-sm font-bold w-full text-center ${risk.bgColor} ${risk.textColor}`}
                                    >
                                        {risk.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
