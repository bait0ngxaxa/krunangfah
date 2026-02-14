import { ChevronRight } from "lucide-react";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { RISK_CONFIG } from "./constants";
import type { Student } from "./types";

interface StudentResultItemProps {
    student: Student;
    onClick: (id: string) => void;
}

export function StudentResultItem({
    student,
    onClick,
}: StudentResultItemProps) {
    const latestResult = student.phqResults[0];
    const risk = latestResult
        ? RISK_CONFIG[latestResult.riskLevel as RiskLevel]
        : null;

    return (
        <button
            onClick={() => onClick(student.id)}
            className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 hover:bg-pink-50/40 transition-all text-left group"
        >
            {/* Student Info */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-pink-200/40 group-hover:scale-105 transition-transform shrink-0">
                    {student.firstName.charAt(0)}
                </div>
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-800 group-hover:text-pink-700 transition-colors truncate">
                        {student.firstName} {student.lastName}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-600 text-xs font-medium">
                            ห้อง {student.class}
                        </span>
                        {student.studentId && (
                            <span className="text-xs text-gray-400">
                                #{student.studentId}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Risk Badge + Arrow */}
            <div className="flex items-center gap-2 shrink-0">
                {risk && (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${risk.bgColor} ${risk.textColor} border ${risk.borderColor}`}
                    >
                        <span className="text-[10px] leading-none">
                            {risk.emoji}
                        </span>
                        <span className="hidden sm:inline">{risk.label}</span>
                    </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
            </div>
        </button>
    );
}
