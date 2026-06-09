"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
    getRiskLevelConfig,
    type RiskLevel,
} from "@/lib/constants/risk-levels";

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
            className={`overflow-hidden rounded-2xl border shadow-lg ring-1 ${config.cardBorder} ${config.cardRing}`}
        >
            <div
                className={`flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between ${config.headerGradient} ${config.headerTextColor}`}
            >
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="text-lg leading-none" aria-hidden="true">
                        {config.emoji}
                    </span>
                    <h3 className="min-w-0 break-words text-[15px] font-bold tracking-wide">
                        {config.label}
                    </h3>
                </div>
                <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${config.countBg} ${config.countText}`}
                >
                    {students.length.toLocaleString("th-TH")} คน
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
                    <div className="divide-y divide-gray-100/80" role="list">
                        {students.map((student, index) => (
                            <div
                                key={student.id}
                                className={`group flex flex-col gap-3 px-4 py-3 transition-base duration-200 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${config.hoverBg}`}
                                role="listitem"
                            >
                                <Link
                                    href={`/students/${student.id}`}
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
