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
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all cursor-pointer border border-gray-100"
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">
                        {student.firstName} {student.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {student.class}
                        {student.studentId && ` • รหัส ${student.studentId}`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {latestResult && (
                        <span className="text-lg font-bold text-gray-700">
                            {latestResult.totalScore}
                        </span>
                    )}
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-medium text-white ${RISK_BG_CLASSES[riskLevel]}`}
                    >
                        {RISK_LABELS[riskLevel]}
                    </span>
                </div>
            </div>
        </div>
    );
}
