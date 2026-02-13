"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, AlertTriangle, ChevronRight, X } from "lucide-react";
import { searchStudents } from "@/lib/actions/student";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

const MAX_VISIBLE_RESULTS = 6;
const RESULT_ROW_HEIGHT = 72;
const MAX_LIST_HEIGHT = MAX_VISIBLE_RESULTS * RESULT_ROW_HEIGHT;

type Student = {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    class: string;
    phqResults: Array<{
        totalScore: number;
        riskLevel: string;
    }>;
};

const RISK_CONFIG: Record<
    RiskLevel,
    { label: string; emoji: string; bgColor: string; textColor: string; borderColor: string }
> = {
    blue: {
        label: "ปกติ",
        emoji: "🔵",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
    },
    green: {
        label: "เสี่ยงต่ำ",
        emoji: "🟢",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        emoji: "🟡",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
    },
    orange: {
        label: "เสี่ยงสูง",
        emoji: "🟠",
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
        borderColor: "border-orange-200",
    },
    red: {
        label: "เสี่ยงสูงมาก",
        emoji: "🔴",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
    },
};

export function StudentSearch() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Student[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);

    const isScrollable = results.length > MAX_VISIBLE_RESULTS;
    const showFade = isScrollable && !scrolledToBottom;

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
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
    }, [isScrollable, checkScroll, results]);

    // Real-time search with debounce
    useEffect(() => {
        const performSearch = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setIsSearching(true);
            const students = await searchStudents(query.trim());
            setResults(students as Student[]);
            setIsSearching(false);
        };

        // Debounce: wait 300ms after user stops typing
        const timeoutId = setTimeout(performSearch, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleStudentClick = (studentId: string): void => {
        router.push(`/students/${studentId}`);
    };

    return (
        <div>
            {/* Search Input */}
            <div className="relative mb-5 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="พิมพ์ชื่อ, นามสกุล หรือรหัสนักเรียน..."
                    className="w-full pl-12 pr-12 py-3.5 bg-white/60 border border-pink-100 rounded-xl focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400 shadow-sm hover:shadow-md hover:border-pink-200 backdrop-blur-sm"
                />
                {isSearching ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-pink-100 border-b-pink-500" />
                    </div>
                ) : (
                    query && (
                        <button
                            onClick={() => setQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-all"
                        >
                            <span className="sr-only">Clear</span>
                            <X className="w-4 h-4" />
                        </button>
                    )
                )}
            </div>

            {/* Empty State */}
            {!query.trim() && (
                <div className="text-center py-10 text-gray-500 bg-white/30 rounded-2xl border border-white/50 backdrop-blur-sm">
                    <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="w-7 h-7 text-pink-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">
                        พิมพ์เพื่อค้นหานักเรียน
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        ค้นหาได้ทั้งชื่อ และรหัสนักเรียน
                    </p>
                </div>
            )}

            {/* No Results */}
            {query.trim() && !isSearching && results.length === 0 && (
                <div className="text-center py-10 text-gray-500 bg-white/30 rounded-2xl border border-white/50 backdrop-blur-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">
                        ไม่พบนักเรียน
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        ลองค้นหาด้วยคำอื่น หรือตรวจสอบตัวสะกด
                    </p>
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-3">
                    {/* Limit Indicator */}
                    {results.length === 50 && (
                        <div className="bg-pink-50/80 border border-pink-200 rounded-xl p-3.5 flex items-start gap-3 backdrop-blur-sm">
                            <AlertTriangle className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-pink-700">
                                    แสดง 50 รายการแรก
                                </p>
                                <p className="text-xs text-pink-600 mt-0.5">
                                    พิมพ์ชื่อให้ชัดเจนขึ้นเพื่อค้นหาที่แม่นยำยิ่งขึ้น
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Results Header */}
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-gray-500 font-medium">
                            ผลการค้นหา
                        </span>
                        <span className="text-xs text-pink-600 font-bold bg-pink-50 px-2.5 py-0.5 rounded-full">
                            พบ {results.length} รายการ
                        </span>
                    </div>

                    {/* Results List */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-pink-100/60 ring-1 ring-pink-50 overflow-hidden shadow-sm">
                        <div className="relative">
                            <div
                                ref={scrollRef}
                                className={isScrollable ? "overflow-y-auto" : ""}
                                style={isScrollable ? { maxHeight: MAX_LIST_HEIGHT } : undefined}
                            >
                                <div className="divide-y divide-gray-100/80">
                                    {results.map((student) => {
                                        const latestResult = student.phqResults[0];
                                        const risk = latestResult
                                            ? RISK_CONFIG[latestResult.riskLevel as RiskLevel]
                                            : null;

                                        return (
                                            <button
                                                key={student.id}
                                                onClick={() => handleStudentClick(student.id)}
                                                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 hover:bg-pink-50/40 transition-all text-left group"
                                            >
                                                {/* Student Info */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-pink-200/40 group-hover:scale-105 transition-transform shrink-0">
                                                        {student.firstName.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-bold text-gray-800 group-hover:text-pink-700 transition-colors truncate">
                                                            {student.firstName}{" "}
                                                            {student.lastName}
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
                                                            <span className="text-[10px] leading-none">{risk.emoji}</span>
                                                            <span className="hidden sm:inline">{risk.label}</span>
                                                        </span>
                                                    )}
                                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Scroll fade indicator */}
                            {isScrollable && showFade && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-white pointer-events-none"
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
