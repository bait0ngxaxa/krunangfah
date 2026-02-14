"use client";

import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { formatAcademicYear } from "@/lib/utils/academic-year";
import { AlertTriangle, ClipboardList } from "lucide-react";

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
            <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-8 border border-pink-200 ring-1 ring-pink-50 text-center overflow-hidden">
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-rose-200/40 to-pink-300/30 rounded-full blur-xl pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />
                <p className="relative text-gray-500">
                    ยังไม่มีประวัติการคัดกรอง
                </p>
            </div>
        );
    }

    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 md:p-8 border border-pink-200 ring-1 ring-pink-50 overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />
            {/* Corner decoration */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-linear-to-br from-rose-200/45 to-pink-300/35 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-[6px] h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

            <h2 className="relative text-2xl font-bold mb-6 flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-rose-500" />
                <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                    ประวัติการคัดกรองสุขภาพจิต
                </span>
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
                                    <td className="py-4 px-6">
                                        {hasWarning && (
                                            <div className="space-y-1">
                                                {result.q9a && (
                                                    <div className="flex items-center gap-1.5 text-rose-600 text-sm font-medium">
                                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                                        <span>
                                                            มีความคิดฆ่าตัวตาย
                                                        </span>
                                                    </div>
                                                )}
                                                {result.q9b && (
                                                    <div className="flex items-center gap-1.5 text-red-700 text-sm font-medium">
                                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                                        <span>
                                                            เคยลงมือฆ่าตัวตาย
                                                        </span>
                                                    </div>
                                                )}
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
                            </div>
                            {hasWarning && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1">
                                    {result.q9a && (
                                        <div className="flex items-center gap-1.5 text-rose-600 text-sm font-medium">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>มีความคิดฆ่าตัวตาย</span>
                                        </div>
                                    )}
                                    {result.q9b && (
                                        <div className="flex items-center gap-1.5 text-red-700 text-sm font-medium">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>เคยลงมือฆ่าตัวตาย</span>
                                        </div>
                                    )}
                                </div>
                            )}
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
