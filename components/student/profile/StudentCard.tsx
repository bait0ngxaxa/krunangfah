"use client";

/**
 * Student Card Component
 * แสดงข้อมูลนักเรียนพร้อมระดับความเสี่ยง
 */

import {
    RISK_LABELS,
    RISK_BG_CLASSES,
    type RiskLevel,
} from "@/lib/utils/phq-scoring";

interface StudentCardProps {
    student: {
        id: string;
        firstName: string;
        lastName: string;
        class: string;
        studentId?: string | null;
        phqResults?: {
            totalScore: number;
            riskLevel: string;
            createdAt: Date;
        }[];
    };
    onClick?: () => void;
}

export function StudentCard({ student, onClick }: StudentCardProps) {
    const latestResult = student.phqResults?.[0];
    const riskLevel = (latestResult?.riskLevel || "blue") as RiskLevel;

    return (
        <div
            onClick={onClick}
            className="group bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-sm hover:shadow-lg hover:shadow-pink-100/50 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
        >
            <div className="absolute inset-0 bg-linear-to-br from-white/40 to-pink-50/20 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform duration-300">
                        {student.firstName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg group-hover:text-pink-700 transition-colors">
                            {student.firstName} {student.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {student.class}
                            </span>
                            {student.studentId && (
                                <span className="opacity-70 text-xs">
                                    #{student.studentId}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    {latestResult && (
                        <span className="text-xs font-bold text-gray-400">
                            คะแนน {latestResult.totalScore}
                        </span>
                    )}
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm border border-white/20 ${RISK_BG_CLASSES[riskLevel]}`}
                    >
                        {RISK_LABELS[riskLevel]}
                    </span>
                </div>
            </div>
        </div>
    );
}
