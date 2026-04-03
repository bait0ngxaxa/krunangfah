"use client";

import {
    User,
    FileText,
    Hospital,
    ClipboardCheck,
    School,
    Hash,
    Cake,
} from "lucide-react";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";
import { formatAcademicYear } from "@/lib/utils/academic-year";

interface StudentProfileCardProps {
    student: {
        firstName: string;
        lastName: string;
        studentId?: string | null;
        gender?: string | null;
        age?: number | null;
        class: string;
    };
    latestResult?: {
        totalScore: number;
        riskLevel: string;
        referredToHospital: boolean;
        hospitalName?: string | null;
        createdAt: Date;
        academicYear: {
            year: number;
            semester: number;
        };
    } | null;
}

export function StudentProfileCard({
    student,
    latestResult,
}: StudentProfileCardProps) {
    const risk = latestResult
        ? getRiskLevelConfig(latestResult.riskLevel as RiskLevel)
        : null;
    const avatarBg = risk
        ? `bg-gradient-to-br ${risk.gradient}`
        : "bg-[#0BD0D9]";

    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-6 sm:p-7 md:p-8 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)] transition-all duration-300 hover:shadow-[0_24px_44px_-24px_rgba(15,23,42,0.5)]">
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl" />
            <div className="relative flex flex-col gap-7 md:flex-row md:items-start md:justify-between z-10">
                {/* Student Info */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    <div className="relative shrink-0">
                        <div
                            className={`h-18 w-18 sm:h-24 sm:w-24 rounded-full ${avatarBg} flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-lg ring-4 ring-white/90`}
                        >
                            {student.firstName.charAt(0)}
                        </div>
                    </div>
                    <div className="min-w-0 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 wrap-break-words">
                            {student.firstName} {student.lastName}
                        </h1>
                        <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-gray-500 font-medium">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-emerald-200 bg-emerald-50/70 text-emerald-700 shadow-sm">
                                <School className="w-3.5 h-3.5" />
                                ห้อง {student.class}
                            </span>
                            {student.gender && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-purple-200 bg-purple-50/70 text-purple-700 shadow-sm">
                                    <User className="w-3.5 h-3.5" />
                                    {student.gender === "MALE" ? "ชาย" : "หญิง"}
                                </span>
                            )}
                            {student.age && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-blue-200 bg-blue-50/70 text-blue-700 shadow-sm">
                                    <Cake className="w-3.5 h-3.5" />
                                    อายุ {student.age} ปี
                                </span>
                            )}
                            {student.studentId && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-gray-200 bg-white/90 text-gray-700 shadow-sm">
                                    <Hash className="w-3.5 h-3.5" />
                                    รหัส {student.studentId}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Risk Badge */}
                {risk && latestResult && (
                    <div className="flex w-full md:w-auto flex-col items-stretch md:items-end gap-3">
                        <div
                            className={`${risk.headerGradient} ${risk.headerTextColor} pl-4 pr-5 py-2.5 rounded-2xl font-bold text-base shadow-md flex items-center gap-2.5`}
                        >
                            <span className="text-lg leading-none">
                                {risk.emoji}
                            </span>
                            <span>{risk.label}</span>
                        </div>
                        {latestResult.riskLevel === "red" && (
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm border transition-transform hover:scale-105 ${
                                    latestResult.referredToHospital
                                        ? "bg-orange-50 text-orange-700 border-orange-200"
                                        : "bg-sky-50 text-sky-700 border-sky-200"
                                }`}
                            >
                                {latestResult.referredToHospital ? (
                                    <>
                                        <Hospital className="w-4 h-4" />
                                        ส่งต่อ:{" "}
                                        {latestResult.hospitalName ||
                                            "โรงพยาบาล"}
                                    </>
                                ) : (
                                    <>
                                        <ClipboardCheck className="w-4 h-4" />
                                        ติดตามต่อ
                                    </>
                                )}
                            </div>
                        )}
                        <div className="rounded-2xl border border-gray-200 bg-white/75 px-4 py-3 shadow-sm md:text-right">
                            <div className="text-sm text-gray-500 font-medium">
                                ประเมินล่าสุด:{" "}
                                <span className="text-emerald-600">
                                    {formatAcademicYear(
                                        latestResult.academicYear.year,
                                        latestResult.academicYear.semester,
                                        "long",
                                    )}
                                </span>
                            </div>
                            <div className="mt-1 inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500">
                                {new Date(
                                    latestResult.createdAt,
                                ).toLocaleDateString("th-TH", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!latestResult && (
                <div className="mt-8 p-6 bg-emerald-50/50 rounded-2xl border-2 border-dashed border-emerald-200 text-center text-gray-500 flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <p className="font-medium">ยังไม่มีผลการคัดกรอง PHQ-A</p>
                </div>
            )}
        </div>
    );
}
