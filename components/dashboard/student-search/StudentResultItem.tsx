import { ChevronRight } from "lucide-react";
import type { RiskLevel } from "@/lib/constants/risk-levels";
import { RISK_CONFIG } from "./constants";
import type { Student } from "./types";

interface StudentResultItemProps {
    student: Student;
    onClick: (id: string) => void;
    canViewNationalId?: boolean;
}

export function StudentResultItem({
    student,
    onClick,
    canViewNationalId = false,
}: StudentResultItemProps) {
    const latestResult = student.phqResults[0];
    const risk = latestResult
        ? RISK_CONFIG[latestResult.riskLevel as RiskLevel]
        : null;
    const avatarClass = risk
        ? `${risk.bgColor} ${risk.textColor} border ${risk.borderColor}`
        : "bg-slate-100 text-slate-600 border border-slate-200";
    const displayName =
        `${student.firstName} ${student.lastName}`.trim() || "ไม่ระบุชื่อ";
    const avatarInitial = displayName.charAt(0);

    return (
        <button
            type="button"
            onClick={() => onClick(student.id)}
            className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-base hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300 sm:px-5"
        >
            {/* Student Info */}
            <div className="flex min-w-0 items-center gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm motion-safe:transition-transform motion-safe:group-hover:scale-105 ${avatarClass}`}
                >
                    {avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="break-words text-sm font-bold text-gray-800 transition-colors group-hover:text-emerald-700">
                        {displayName}
                    </h4>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="max-w-full break-words rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                            ห้อง {student.class}
                        </span>
                        {student.studentId && (
                            <span className="max-w-full break-words text-xs text-gray-500">
                                #{student.studentId}
                            </span>
                        )}
                        {canViewNationalId && student.nationalId && (
                            <span className="max-w-full break-words text-xs font-medium text-slate-500">
                                เลขบัตร {student.nationalId}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Risk Badge + Arrow */}
            <div className="flex shrink-0 items-center gap-2">
                {risk && (
                    <span
                        className={`inline-flex max-w-[8rem] items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${risk.bgColor} ${risk.textColor} ${risk.borderColor}`}
                    >
                        <span className="text-[10px] leading-none">
                            {risk.emoji}
                        </span>
                        <span className="hidden min-w-0 break-words sm:inline">
                            {risk.label}
                        </span>
                    </span>
                )}
                <ChevronRight
                    className="h-4 w-4 text-gray-300 transition-colors group-hover:text-emerald-400 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                    aria-hidden="true"
                />
            </div>
        </button>
    );
}
