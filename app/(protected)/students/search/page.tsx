"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Users } from "lucide-react";
import { searchStudents } from "@/lib/actions/student";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

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

const riskConfig: Record<
    RiskLevel,
    { label: string; bgColor: string; textColor: string; borderColor?: string }
> = {
    blue: {
        label: "ไม่มีความเสี่ยง",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
    },
    green: {
        label: "เสี่ยงน้อย",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
    },
    orange: {
        label: "เสี่ยงสูง",
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
        borderColor: "border-orange-200",
    },
    red: {
        label: "เสี่ยงสูงมาก",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
    },
};

function StudentSearchContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Student[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        if (initialQuery) {
            handleSearch(initialQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (query.trim()) {
                handleSearch(query);
            } else {
                setResults([]);
                setHasSearched(false);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [query]);

    const handleSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);

        try {
            const data = await searchStudents(searchQuery);
            setResults(data);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 right-0 w-80 h-80 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-x-1/3 pointer-events-none animate-pulse-slow" />
            <div className="absolute bottom-10 left-0 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-x-1/3 pointer-events-none animate-pulse-slow delay-1000" />

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="mb-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-white/80 px-4 py-2 rounded-full shadow-sm hover:shadow-pink-100 border border-transparent hover:border-pink-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>กลับหน้า Dashboard</span>
                    </Link>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-white/60 relative overflow-hidden ring-1 ring-pink-50">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />

                    <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-6 py-1 drop-shadow-sm">
                        ค้นหานักเรียน
                    </h1>

                    <div className="relative mb-6 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-pink-500 transition-colors" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="ค้นหาด้วยชื่อ นามสกุล หรือรหัสนักเรียน"
                            className="w-full pl-12 pr-4 py-3.5 border border-pink-100 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none transition-all placeholder:text-gray-400 hover:border-pink-200 bg-white shadow-sm"
                        />
                        {isSearching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-pink-100 border-t-pink-500 dashed" />
                            </div>
                        )}
                    </div>

                    {!hasSearched ? (
                        <div className="text-center py-16 bg-pink-50/30 rounded-2xl border border-pink-100/50 border-dashed">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-pink-100">
                                <Search className="w-8 h-8 text-pink-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">
                                เริ่มต้นค้นหา
                            </h3>
                            <p className="text-gray-500">
                                พิมพ์ชื่อ นามสกุล หรือรหัสนักเรียนเพื่อค้นหา
                            </p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-200">
                                <Users className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">
                                ไม่พบข้อมูล
                            </h3>
                            <p className="text-gray-500">
                                ไม่พบนักเรียนที่ตรงกับคำค้นหา &ldquo;{query}&rdquo;
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-fade-in-up">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <span className="bg-pink-100 text-pink-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                    ผลลัพธ์
                                </span>
                                <p className="text-sm font-medium text-gray-600">
                                    พบ {results.length} คน
                                </p>
                            </div>

                            {results.map((student) => {
                                const latestResult = student.phqResults[0];
                                const riskLevel =
                                    latestResult?.riskLevel as RiskLevel;
                                const config =
                                    riskConfig[riskLevel] || riskConfig.blue;

                                return (
                                    <Link
                                        key={student.id}
                                        href={`/students/${student.id}`}
                                        className="block p-5 bg-white hover:bg-pink-50/30 border border-gray-100 hover:border-pink-200 rounded-2xl transition-all duration-300 hover:shadow-md hover:shadow-pink-100 group relative overflow-hidden"
                                    >
                                        <div className="absolute left-0 top-0 w-1 h-full bg-transparent group-hover:bg-pink-400 transition-colors" />

                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-800 group-hover:text-pink-700 transition-colors">
                                                    {student.firstName}{" "}
                                                    {student.lastName}
                                                </h3>
                                                <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                                                    {student.studentId && (
                                                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                                            <span className="text-xs font-medium">
                                                                ID:
                                                            </span>
                                                            <span className="font-mono text-gray-700">
                                                                {
                                                                    student.studentId
                                                                }
                                                            </span>
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-pink-300" />
                                                        ห้อง {student.class}
                                                    </span>
                                                </div>
                                            </div>
                                            {latestResult && (
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">
                                                            คะแนน PHQ-A
                                                        </div>
                                                        <div className="text-xl font-bold bg-linear-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                                                            {
                                                                latestResult.totalScore
                                                            }
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${config.bgColor} ${config.textColor} ${config.borderColor} shadow-sm`}
                                                    >
                                                        {config.label}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function StudentSearchPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-pink-200 border-t-pink-500" />
                </div>
            }
        >
            <StudentSearchContent />
        </Suspense>
    );
}
