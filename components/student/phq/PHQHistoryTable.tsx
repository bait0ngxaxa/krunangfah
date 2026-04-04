"use client";

import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";
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

export function PHQHistoryTable({ results }: PHQHistoryTableProps) {
    if (results.length === 0) {
        return (
            <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <p className="relative text-gray-500">
                    ยังไม่มีประวัติการคัดกรอง
                </p>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm transition-base duration-300 md:p-8">
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-100/45 blur-3xl" />
            <h2 className="relative text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-white text-[#0BD0D9] shadow-sm">
                    <ClipboardList className="w-5 h-5" />
                </span>
                <span className="text-gray-800">
                    ประวัติการคัดกรองสุขภาพจิต
                </span>
            </h2>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 md:block">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 bg-slate-50/90">
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
                    <tbody className="divide-y divide-gray-100">
                        {results.map((result, index) => {
                            const risk = getRiskLevelConfig(
                                result.riskLevel as RiskLevel,
                            );
                            const hasWarning = result.q9a || result.q9b;

                            return (
                                <tr
                                    key={result.id}
                                    className="transition-colors hover:bg-slate-50/80"
                                >
                                    <td className="py-4 px-6 font-medium text-gray-700 tabular-nums">
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
                                    <td className="py-4 px-6 text-center font-bold text-gray-800 tabular-nums">
                                        {result.totalScore}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-sm font-bold shadow-sm ${risk.bgMedium} ${risk.textColorDark}`}
                                        >
                                            {risk.label}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        {hasWarning && (
                                            <div className="space-y-1">
                                                {result.q9a && (
                                                    <div className="flex items-center gap-1.5 text-orange-600 text-sm font-medium">
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
                    const risk = getRiskLevelConfig(
                        result.riskLevel as RiskLevel,
                    );
                    const hasWarning = result.q9a || result.q9b;

                    return (
                        <div
                            key={result.id}
                            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-base hover:shadow-md"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="mb-1 text-sm font-medium text-slate-500">
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
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1">
                                    {result.q9a && (
                                        <div className="flex items-center gap-1.5 text-orange-600 text-sm font-medium">
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
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
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
                                    <span className="font-bold text-gray-900 text-lg tabular-nums">
                                        {result.totalScore}
                                    </span>
                                </div>
                                <div>
                                    <span
                                        className={`inline-block px-4 py-2 rounded-xl text-sm font-bold w-full text-center ${risk.bgMedium} ${risk.textColorDark}`}
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
