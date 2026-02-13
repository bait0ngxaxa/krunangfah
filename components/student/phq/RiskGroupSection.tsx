"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

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

interface LevelStyle {
    label: string;
    emoji: string;
    headerGradient: string;
    headerTextColor: string;
    cardBg: string;
    cardBorder: string;
    cardRing: string;
    badgeBg: string;
    badgeText: string;
    countBg: string;
    countText: string;
    hoverBg: string;
    hoverText: string;
    btnBase: string;
    btnHover: string;
    fadeTo: string;
    rowBorder: string;
}

const LEVEL_CONFIG: Record<RiskLevel, LevelStyle> = {
    red: {
        label: "เสี่ยงสูงมาก",
        emoji: "🔴",
        headerGradient: "bg-gradient-to-r from-red-500 via-rose-500 to-red-600",
        headerTextColor: "text-white",
        cardBg: "bg-gradient-to-b from-red-50/80 to-white",
        cardBorder: "border-red-200/60",
        cardRing: "ring-red-100/50",
        badgeBg: "bg-red-100",
        badgeText: "text-red-600",
        countBg: "bg-white/30",
        countText: "text-white",
        hoverBg: "hover:bg-red-50/60",
        hoverText: "group-hover:text-red-700",
        btnBase:
            "bg-white text-red-500 border border-red-200 shadow-red-100/50",
        btnHover:
            "hover:bg-red-50 hover:border-red-300 hover:shadow-red-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-red-100/40",
    },
    orange: {
        label: "เสี่ยงสูง",
        emoji: "🟠",
        headerGradient:
            "bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500",
        headerTextColor: "text-white",
        cardBg: "bg-gradient-to-b from-orange-50/80 to-white",
        cardBorder: "border-orange-200/60",
        cardRing: "ring-orange-100/50",
        badgeBg: "bg-orange-100",
        badgeText: "text-orange-600",
        countBg: "bg-white/30",
        countText: "text-white",
        hoverBg: "hover:bg-orange-50/60",
        hoverText: "group-hover:text-orange-700",
        btnBase:
            "bg-white text-orange-500 border border-orange-200 shadow-orange-100/50",
        btnHover:
            "hover:bg-orange-50 hover:border-orange-300 hover:shadow-orange-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-orange-100/40",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        emoji: "🟡",
        headerGradient:
            "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500",
        headerTextColor: "text-amber-900",
        cardBg: "bg-gradient-to-b from-yellow-50/80 to-white",
        cardBorder: "border-yellow-200/60",
        cardRing: "ring-yellow-100/50",
        badgeBg: "bg-yellow-100",
        badgeText: "text-yellow-700",
        countBg: "bg-amber-900/15",
        countText: "text-amber-900",
        hoverBg: "hover:bg-yellow-50/60",
        hoverText: "group-hover:text-amber-700",
        btnBase:
            "bg-white text-amber-600 border border-yellow-200 shadow-yellow-100/50",
        btnHover:
            "hover:bg-yellow-50 hover:border-yellow-300 hover:shadow-yellow-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-yellow-100/40",
    },
    green: {
        label: "เสี่ยงต่ำ",
        emoji: "🟢",
        headerGradient:
            "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600",
        headerTextColor: "text-white",
        cardBg: "bg-gradient-to-b from-green-50/80 to-white",
        cardBorder: "border-green-200/60",
        cardRing: "ring-green-100/50",
        badgeBg: "bg-green-100",
        badgeText: "text-green-600",
        countBg: "bg-white/30",
        countText: "text-white",
        hoverBg: "hover:bg-green-50/60",
        hoverText: "group-hover:text-green-700",
        btnBase:
            "bg-white text-green-600 border border-green-200 shadow-green-100/50",
        btnHover:
            "hover:bg-green-50 hover:border-green-300 hover:shadow-green-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-green-100/40",
    },
    blue: {
        label: "ปกติ",
        emoji: "🔵",
        headerGradient:
            "bg-gradient-to-r from-blue-500 via-sky-500 to-blue-600",
        headerTextColor: "text-white",
        cardBg: "bg-gradient-to-b from-blue-50/80 to-white",
        cardBorder: "border-blue-200/60",
        cardRing: "ring-blue-100/50",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-600",
        countBg: "bg-white/30",
        countText: "text-white",
        hoverBg: "hover:bg-blue-50/60",
        hoverText: "group-hover:text-blue-700",
        btnBase:
            "bg-white text-blue-500 border border-blue-200 shadow-blue-100/50",
        btnHover:
            "hover:bg-blue-50 hover:border-blue-300 hover:shadow-blue-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-blue-100/40",
    },
};

export function RiskGroupSection({
    level,
    students,
    onStudentClick,
}: RiskGroupSectionProps) {
    const config = LEVEL_CONFIG[level];
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
