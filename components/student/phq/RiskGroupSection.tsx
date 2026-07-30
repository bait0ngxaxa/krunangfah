"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
    getRiskLevelConfig,
    type RiskLevel,
} from "@/lib/constants/risk-levels";

const MAX_PREVIEW_ROWS = 6;

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    studentId?: string | null;
    class: string;
    phqResults: {
        totalScore: number;
        riskLevel: string;
    }[];
    referral?: {
        id: string;
        fromTeacherUserId: string;
        toTeacherUserId: string;
    } | null;
}

interface RiskGroupSectionProps {
    level: RiskLevel;
    students: Student[];
    totalCount: number;
    viewAllHref?: string;
    readOnly?: boolean;
    studentDetailQuery?: string;
}

function formatCount(count: number): string {
    if (!Number.isFinite(count) || count < 0) {
        return "0";
    }

    return count.toLocaleString("th-TH");
}

export function RiskGroupSection({
    level,
    students,
    totalCount,
    viewAllHref,
    readOnly = false,
    studentDetailQuery = "",
}: RiskGroupSectionProps): ReactElement | null {
    const config = getRiskLevelConfig(level);
    const [showAllStudents, setShowAllStudents] = useState(false);
    const resolvedTotalCount = Math.max(totalCount, students.length);

    if (resolvedTotalCount === 0) {
        return null;
    }

    const previewStudents = students.slice(0, MAX_PREVIEW_ROWS);
    const visibleStudents = showAllStudents ? students : previewStudents;
    const canExpandLoadedStudents = students.length > MAX_PREVIEW_ROWS;
    const hasMoreStudents = resolvedTotalCount > previewStudents.length;
    const shouldShowViewAllAction =
        !showAllStudents &&
        hasMoreStudents &&
        (canExpandLoadedStudents || Boolean(viewAllHref));
    const actionLabel =
        level === "red" || level === "blue"
            ? "หลักการพูดคุย"
            : "เข้าสู่ระบบใบงาน";

    return (
        <details
            className={`group overflow-hidden rounded-2xl border shadow-lg ring-1 ${config.cardBorder} ${config.cardRing}`}
        >
            <summary
                className={`flex cursor-pointer list-none flex-col gap-2 px-5 py-3.5 outline-none transition-base hover:brightness-[0.99] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden ${config.headerGradient} ${config.headerTextColor}`}
            >
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="text-lg leading-none" aria-hidden="true">
                        {config.emoji}
                    </span>
                    <h3 className="min-w-0 break-words text-[15px] font-bold tracking-wide">
                        {config.label}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${config.countBg} ${config.countText}`}
                    >
                        {formatCount(resolvedTotalCount)} คน
                    </span>
                    <ChevronDown
                        className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                    />
                </div>
            </summary>

            <div className={`${config.cardBg}`}>
                {previewStudents.length > 0 ? (
                    <div
                        id={`risk-group-${level}-students`}
                        className="divide-y divide-gray-100/80"
                        role="list"
                    >
                        {visibleStudents.map((student, index) => (
                            <div
                                key={student.id}
                                className={`group flex flex-col gap-3 px-4 py-3 transition-base duration-200 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${config.hoverBg}`}
                                role="listitem"
                            >
                                <Link
                                    href={`/students/${student.id}${studentDetailQuery}`}
                                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                                >
                                    <span
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${config.badgeBg} ${config.badgeText}`}
                                    >
                                        {index + 1}
                                    </span>
                                    <span
                                        className={`min-w-0 break-words text-sm font-medium text-gray-700 transition-colors ${config.hoverText}`}
                                    >
                                        {`${student.firstName} ${student.lastName}`.trim() ||
                                            "ไม่ระบุชื่อ"}
                                    </span>
                                    {student.referral ? (
                                        <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                                            ส่งต่อ
                                        </span>
                                    ) : null}
                                </Link>

                                {!readOnly ? (
                                    <Link
                                        href={`/students/${student.id}/help`}
                                        className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm transition-base duration-200 motion-safe:hover:-translate-y-px active:translate-y-0 sm:whitespace-nowrap ${config.btnBase} ${config.btnHover} hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300`}
                                    >
                                        <span className="min-w-0 break-words">
                                            {actionLabel}
                                        </span>
                                        <ChevronRight
                                            className="h-3.5 w-3.5 shrink-0 opacity-60 transition-base group-hover:opacity-100 motion-safe:group-hover:translate-x-0.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="px-5 py-4 text-sm text-slate-500">
                        รายชื่อกลุ่มนี้อยู่ในหน้าอื่น
                    </p>
                )}

                {shouldShowViewAllAction ? (
                    <div className="border-t border-slate-100 px-4 py-3.5 sm:px-5">
                        {canExpandLoadedStudents ? (
                            <button
                                type="button"
                                onClick={() => setShowAllStudents(true)}
                                aria-expanded={showAllStudents}
                                aria-controls={`risk-group-${level}-students`}
                                className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${config.btnBase} ${config.btnHover}`}
                            >
                                ดูทั้งหมด {formatCount(resolvedTotalCount)} คน
                                <ChevronDown
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                            </button>
                        ) : viewAllHref ? (
                            <Link
                                href={viewAllHref}
                                className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${config.btnBase} ${config.btnHover}`}
                            >
                                ดูทั้งหมด {formatCount(resolvedTotalCount)} คน
                                <ChevronRight
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                            </Link>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </details>
    );
}
