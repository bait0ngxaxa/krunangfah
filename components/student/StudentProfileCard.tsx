"use client";

import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { formatAcademicYear } from "@/lib/utils/academic-year";

interface StudentProfileCardProps {
    student: {
        firstName: string;
        lastName: string;
        studentId?: string | null;
        class: string;
    };
    latestResult?: {
        totalScore: number;
        riskLevel: string;
        createdAt: Date;
        academicYear: {
            year: number;
            semester: number;
        };
    } | null;
}

const riskConfig: Record<
    RiskLevel,
    { label: string; bgColor: string; textColor: string; emoji: string }
> = {
    blue: {
        label: "ไม่มีความเสี่ยง",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
        emoji: "😊",
    },
    green: {
        label: "เสี่ยงน้อย",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
        emoji: "🙂",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
        emoji: "😐",
    },
    orange: {
        label: "เสี่ยงสูง",
        bgColor: "bg-orange-100",
        textColor: "text-orange-700",
        emoji: "😟",
    },
    red: {
        label: "เสี่ยงสูงมาก",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
        emoji: "😰",
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
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-pink-300 to-purple-300" />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Student Info */}
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-linear-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                        {student.firstName.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                            {student.firstName} {student.lastName}
                        </h1>
                        <div className="flex items-center gap-3 mt-1 text-gray-600">
                            <span className="text-sm font-medium">
                                ห้อง {student.class}
                            </span>
                            {student.studentId && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-sm">
                                        รหัส {student.studentId}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Risk Badge */}
                {risk && latestResult && (
                    <div className="flex flex-col items-end gap-2">
                        <div
                            className={`${risk.bgColor} ${risk.textColor} px-6 py-3 rounded-full font-bold text-lg shadow-md flex items-center gap-2`}
                        >
                            <span className="text-2xl">{risk.emoji}</span>
                            <span>{risk.label}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                            ประเมินล่าสุด:{" "}
                            {formatAcademicYear(
                                latestResult.academicYear.year,
                                latestResult.academicYear.semester,
                                "long",
                            )}
                        </div>
                        <div className="text-xs text-gray-400">
                            {new Date(
                                latestResult.createdAt,
                            ).toLocaleDateString("th-TH", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>
                    </div>
                )}
            </div>

            {!latestResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                    <p>ยังไม่มีผลการคัดกรอง PHQ-A</p>
                </div>
            )}
        </div>
    );
}
