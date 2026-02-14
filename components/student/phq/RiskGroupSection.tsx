"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { RISK_LEVEL_CONFIG } from "@/lib/constants/risk-levels";

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
}

interface RiskGroupSectionProps {
    level: RiskLevel;
    students: Student[];
    onStudentClick?: (studentId: string) => void;
}

export function RiskGroupSection({
    level,
    students,
    onStudentClick,
}: RiskGroupSectionProps) {
    const config = RISK_LEVEL_CONFIG[level];
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);

    const isScrollable = students.length > MAX_VISIBLE_ROWS;
    const showFade = isScrollable && !scrolledToBottom;

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const distanceFromBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight;
        setScrolledToBottom(distanceFromBottom <= 8);
    }, []);

    useEffect(() => {
        if (!isScrollable) return;
        const el = scrollRef.current;
        if (!el) return;
        const rafId = requestAnimationFrame(() => checkScroll());
        el.addEventListener("scroll", checkScroll, { passive: true });
        return () => {
            cancelAnimationFrame(rafId);
            el.removeEventListener("scroll", checkScroll);
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
            {/* Header */}
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
                    className={`${config.countBg} ${config.countText} text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm`}
                >
                    {students.length} คน
                </span>
            </div>

            {/* Student List */}
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
                                className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3 ${config.hoverBg} cursor-pointer transition-all duration-200 group`}
                                role="button"
                                tabIndex={0}
                                onClick={() => onStudentClick?.(student.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        onStudentClick?.(student.id);
                                    }
                                }}
                            >
                                {/* Student info */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <span
                                        className={`${config.badgeBg} ${config.badgeText} text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0`}
                                    >
                                        {index + 1}
                                    </span>
                                    <span
                                        className={`text-sm font-medium text-gray-700 ${config.hoverText} transition-colors truncate`}
                                    >
                                        {student.firstName} {student.lastName}
                                    </span>
                                </div>

                                {/* Action button */}
                                <Link
                                    href={`/students/${student.id}/help`}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm ${config.btnBase} ${config.btnHover} hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-all duration-200 whitespace-nowrap`}
                                >
                                    {actionLabel}
                                    <svg
                                        className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2.5}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                        />
                                    </svg>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scroll fade indicator */}
                {isScrollable && showFade && (
                    <div
                        className={`absolute bottom-0 left-0 right-0 h-12 bg-linear-to-b ${config.fadeTo} pointer-events-none`}
                        aria-hidden="true"
                    />
                )}
            </div>
        </div>
    );
}
