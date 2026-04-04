"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";

const MAX_VISIBLE_ROWS = 6;
const ROW_HEIGHT_PX = 56;
const MAX_LIST_HEIGHT = MAX_VISIBLE_ROWS * ROW_HEIGHT_PX;

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
    readOnly?: boolean;
}

export function RiskGroupSection({
    level,
    students,
    readOnly = false,
}: RiskGroupSectionProps) {
    const config = getRiskLevelConfig(level);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);

    const isScrollable = students.length > MAX_VISIBLE_ROWS;
    const showFade = isScrollable && !scrolledToBottom;

    const checkScroll = useCallback(() => {
        const element = scrollRef.current;
        if (!element) return;
        // Small threshold prevents flicker when browser reports sub-pixel scroll positions.
        const distanceFromBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight;
        setScrolledToBottom(distanceFromBottom <= 8);
    }, []);

    useEffect(() => {
        if (!isScrollable) return;
        const element = scrollRef.current;
        if (!element) return;
        const rafId = requestAnimationFrame(() => checkScroll());
        element.addEventListener("scroll", checkScroll, { passive: true });
        return () => {
            cancelAnimationFrame(rafId);
            element.removeEventListener("scroll", checkScroll);
        };
    }, [isScrollable, checkScroll]);

    if (students.length === 0) {
        return null;
    }

    const actionLabel =
        level === "red" || level === "blue"
            ? "หลักการพูดคุย"
            : "เข้าสู่ระบบใบงาน";

    return (
        <div
            className={`rounded-2xl overflow-hidden shadow-lg ${config.cardBorder} border ring-1 ${config.cardRing}`}
        >
            <div
                className={`${config.headerGradient} ${config.headerTextColor} px-5 py-3.5 flex items-center justify-between`}
            >
                <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none" aria-hidden="true">
                        {config.emoji}
                    </span>
                    <h3 className="font-bold text-[15px] tracking-wide">
                        {config.label}
                    </h3>
                </div>
                <span
                    className={`${config.countBg} ${config.countText} text-xs font-bold px-3 py-1 rounded-full`}
                >
                    {students.length} คน
                </span>
            </div>

            <div className="relative">
                <div
                    ref={scrollRef}
                    className={`${config.cardBg} ${isScrollable ? "overflow-y-auto" : ""}`}
                    style={
                        isScrollable
                            ? { maxHeight: MAX_LIST_HEIGHT }
                            : undefined
                    }
                >
                    <div className="divide-y divide-gray-100/80">
                        {students.map((student, index) => (
                            <div
                                key={student.id}
                                className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3 ${config.hoverBg} transition-base duration-200 group`}
                            >
                                <Link
                                    href={`/students/${student.id}`}
                                    className="flex min-w-0 flex-1 items-center gap-3"
                                >
                                    <span
                                        className={`${config.badgeBg} ${config.badgeText} text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 tabular-nums`}
                                    >
                                        {index + 1}
                                    </span>
                                    <span
                                        className={`text-sm font-medium text-gray-700 ${config.hoverText} transition-colors truncate`}
                                    >
                                        {student.firstName} {student.lastName}
                                    </span>
                                    {student.referral ? (
                                        <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                                            ส่งต่อ
                                        </span>
                                    ) : null}
                                </Link>

                                {!readOnly ? (
                                    <Link
                                        href={`/students/${student.id}/help`}
                                        className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm ${config.btnBase} ${config.btnHover} hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-base duration-200 whitespace-nowrap`}
                                    >
                                        {actionLabel}
                                        <svg
                                            className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-base"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                            />
                                        </svg>
                                    </Link>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>

                {isScrollable && showFade ? (
                    <div
                        className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-white to-transparent pointer-events-none"
                        aria-hidden="true"
                    />
                ) : null}
            </div>
        </div>
    );
}
