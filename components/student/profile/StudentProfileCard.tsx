"use client";

import { User, FileText, Hospital, ClipboardCheck } from "lucide-react";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
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

const riskConfig: Record<
    RiskLevel,
    { label: string; bgColor: string; textColor: string; circleColor: string }
> = {
    blue: {
        label: "ไม่มีความเสี่ยง",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
        circleColor: "bg-blue-500",
    },
    green: {
        label: "เสี่ยงน้อย",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
        circleColor: "bg-green-500",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
        circleColor: "bg-yellow-500",
    },
    orange: {
        label: "เสี่ยงสูง",
        bgColor: "bg-orange-100",
        textColor: "text-orange-700",
        circleColor: "bg-orange-500",
    },
    red: {
        label: "เสี่ยงสูงมาก",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
        circleColor: "bg-red-500",
    },
};

export function StudentProfileCard({
    student,
    latestResult,
}: StudentProfileCardProps) {
    const risk = latestResult
        ? riskConfig[latestResult.riskLevel as RiskLevel]
        : null;

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 md:p-8 border border-white/60 ring-1 ring-pink-50 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />

            {/* Decorative background blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-rose-50 to-pink-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 z-10">
                {/* Student Info */}
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6">
                    <div className="relative shrink-0">
                        <div className="w-18 h-18 sm:w-24 sm:h-24 rounded-full bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-lg shadow-pink-200 ring-4 ring-white">
                            {student.firstName.charAt(0)}
                        </div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-green-400 border-3 sm:border-4 border-white rounded-full" />
                    </div>
                    <div className="text-center sm:text-left min-w-0">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent wrap-break-words">
                            {student.firstName} {student.lastName}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-gray-500 font-medium">
                            <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-lg text-sm border border-pink-100">
                                ห้อง {student.class}
                            </span>
                            {student.gender && (
                                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-sm border border-purple-100">
                                    <User className="w-3.5 h-3.5 inline -mt-0.5" />{" "}
                                    {student.gender === "MALE"
                                        ? "ชาย"
                                        : "หญิง"}
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
                            className={`${risk.bgColor} ${risk.textColor} pl-4 pr-6 py-3 rounded-2xl font-bold text-lg shadow-sm border border-white/50 flex items-center gap-3 backdrop-blur-sm transition-transform hover:scale-105`}
                        >
                            <div
                                className={`w-4 h-4 rounded-full ${risk.circleColor} ring-4 ring-white/50 shadow-sm`}
                            />
                            <span>{risk.label}</span>
                        </div>
                        {latestResult.riskLevel === "red" && (
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm border transition-transform hover:scale-105 ${
                                    latestResult.referredToHospital
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-sky-50 text-sky-700 border-sky-200"
                                }`}
                            >
                                {latestResult.referredToHospital ? (
                                    <>
                                        <Hospital className="w-4 h-4" />
                                        ส่งต่อ: {latestResult.hospitalName || "โรงพยาบาล"}
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
                                <span className="text-pink-600">
                                    {formatAcademicYear(
                                        latestResult.academicYear.year,
                                        latestResult.academicYear.semester,
                                        "long",
                                    )}
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 bg-white/50 px-2 py-1 rounded-md">
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
                <div className="mt-8 p-6 bg-pink-50/50 rounded-2xl border-2 border-dashed border-pink-200 text-center text-gray-500 flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <p className="font-medium">ยังไม่มีผลการคัดกรอง PHQ-A</p>
                </div>
            )}
        </div>
    );
}
