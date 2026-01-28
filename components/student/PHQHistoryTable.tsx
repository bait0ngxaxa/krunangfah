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
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-purple-300 to-pink-300" />

            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                ประวัติการคัดกรองสุขภาพจิต
            </h2>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                ครั้งที่
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                วันที่
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                ปีการศึกษา/เทอม
                            </th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">
                                คะแนนรวม
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                ระดับความเสี่ยง
                            </th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">
                                หมายเหตุ
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((result, index) => {
                            const risk =
                                riskConfig[result.riskLevel as RiskLevel];
                            const hasWarning = result.q9a || result.q9b;

                            return (
                                <tr
                                    key={result.id}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                >
                                    <td className="py-4 px-4 font-medium text-gray-700">
                                        {results.length - index}
                                    </td>
                                    <td className="py-4 px-4 text-gray-600">
                                        {new Date(
                                            result.createdAt,
                                        ).toLocaleDateString("th-TH", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </td>
                                    <td className="py-4 px-4 text-gray-600">
                                        {formatAcademicYear(
                                            result.academicYear.year,
                                            result.academicYear.semester,
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-center font-bold text-gray-800">
                                        {result.totalScore}
                                    </td>
                                    <td className="py-4 px-4">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${risk.bgColor} ${risk.textColor}`}
                                        >
                                            {risk.label}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        {hasWarning && (
                                            <div
                                                className="inline-flex items-center gap-1 text-red-600"
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
                            className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-sm text-gray-500">
                                        ครั้งที่ {results.length - index}
                                    </div>
                                    <div className="font-medium text-gray-700">
                                        {new Date(
                                            result.createdAt,
                                        ).toLocaleDateString("th-TH", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </div>
                                </div>
                                {hasWarning && (
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-gray-600">
                                    {formatAcademicYear(
                                        result.academicYear.year,
                                        result.academicYear.semester,
                                        "long",
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">
                                        คะแนนรวม
                                    </span>
                                    <span className="font-bold text-gray-800">
                                        {result.totalScore}
                                    </span>
                                </div>
                                <div>
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${risk.bgColor} ${risk.textColor}`}
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
