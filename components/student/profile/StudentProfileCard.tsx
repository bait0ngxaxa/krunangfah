"use client";

import { User, FileText, Hospital, ClipboardCheck } from "lucide-react";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { RISK_LEVEL_CONFIG } from "@/lib/constants/risk-levels";
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
        ? RISK_LEVEL_CONFIG[latestResult.riskLevel as RiskLevel]
        : null;

    return (
        <div className="relative bg-white rounded-2xl shadow-sm p-6 sm:p-7 md:p-8 border-2 border-gray-100 overflow-hidden group transition-all duration-300">
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 z-10">
                {/* Student Info */}
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6">
                    <div className="relative shrink-0">
                        <div className="w-18 h-18 sm:w-24 sm:h-24 rounded-full bg-[#0BD0D9] flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-sm ring-4 ring-white">
                            {student.firstName.charAt(0)}
                        </div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-[#34D399] border-3 sm:border-4 border-white rounded-full" />
                    </div>
                    <div className="text-center sm:text-left min-w-0">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 wrap-break-words">
                            {student.firstName} {student.lastName}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-gray-500 font-medium">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100">
                                ห้อง {student.class}
                            </span>
                            {student.gender && (
                                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-sm border border-purple-100">
                                    <User className="w-3.5 h-3.5 inline -mt-0.5" />{" "}
                                    {student.gender === "MALE" ? "ชาย" : "หญิง"}
                                </span>
                            )}
                            {student.age && (
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm border border-blue-100">
                                    อายุ {student.age} ปี
                                </span>
                            )}
                            {student.studentId && (
                                <span className="text-sm border-l-2 border-gray-200 pl-2">
                                    รหัส {student.studentId}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Risk Badge */}
                {risk && latestResult && (
                    <div className="flex flex-col items-end gap-3">
                        <div
                            className={`${risk.headerGradient} ${risk.headerTextColor} pl-4 pr-5 py-2.5 rounded-2xl font-bold text-base shadow-md flex items-center gap-2.5 transition-transform hover:scale-105`}
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
                        <div className="flex flex-col items-end gap-1">
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
                            <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
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
