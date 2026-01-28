"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Users } from "lucide-react";
import { searchStudents } from "@/lib/actions/student.actions";
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
    { label: string; bgColor: string; textColor: string }
> = {
    blue: {
        label: "ไม่มีความเสี่ยง",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
    },
    green: {
        label: "เสี่ยงน้อย",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
    },
    orange: {
        label: "เสี่ยงสูง",
        bgColor: "bg-orange-100",
        textColor: "text-orange-700",
    },
    red: {
        label: "เสี่ยงสูงมาก",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
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
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4 relative overflow-hidden">
            <div className="absolute top-20 right-0 w-80 h-80 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-10 left-0 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-x-1/3 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="mb-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>กลับหน้า Dashboard</span>
                    </Link>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-pink-300 via-purple-300 to-blue-300" />

                    <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-6 py-1">
                        ค้นหานักเรียน
                    </h1>

                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="ค้นหาด้วยชื่อ นามสกุล หรือรหัสนักเรียน"
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        {isSearching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500" />
                            </div>
                        )}
                    </div>

                    {!hasSearched ? (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">
                                พิมพ์เพื่อค้นหานักเรียน
                            </p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">ไม่พบนักเรียน</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-4">
                                พบ {results.length} คน
                            </p>
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
                                        className="block p-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all hover:shadow-md"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-800">
                                                    {student.firstName}{" "}
                                                    {student.lastName}
                                                </h3>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                                    {student.studentId && (
                                                        <span>
                                                            รหัส:{" "}
                                                            {student.studentId}
                                                        </span>
                                                    )}
                                                    <span>
                                                        ห้อง: {student.class}
                                                    </span>
                                                </div>
                                            </div>
                                            {latestResult && (
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="text-sm text-gray-600">
                                                            คะแนน PHQ-A
                                                        </div>
                                                        <div className="text-lg font-bold text-gray-800">
                                                            {
                                                                latestResult.totalScore
                                                            }
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
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
                <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
                </div>
            }
        >
            <StudentSearchContent />
        </Suspense>
    );
}
