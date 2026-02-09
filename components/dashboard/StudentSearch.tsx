"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
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

export function StudentSearch() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Student[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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

    const handleStudentClick = (studentId: string) => {
        router.push(`/students/${studentId}`);
    };

    return (
        <div>
            {/* Search Input */}
            <div className="relative mb-6 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="พิมพ์ชื่อ, นามสกุล หรือรหัสนักเรียน..."
                    className="w-full pl-12 pr-12 py-4 bg-white/50 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none transition-all text-slate-900 placeholder:text-gray-600 shadow-sm hover:shadow-md hover:border-pink-200 backdrop-blur-sm"
                />
                {isSearching ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-b-pink-600" />
                    </div>
                ) : (
                    query && (
                        <button
                            onClick={() => setQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors"
                        >
                            <span className="sr-only">Clear</span>
                            <div className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-pink-50">
                                ×
                            </div>
                        </button>
                    )
                )}
            </div>

            {/* Empty State */}
            {!query.trim() && (
                <div className="text-center py-12 text-gray-500 bg-white/30 rounded-3xl border border-white/50 backdrop-blur-sm">
                    <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
                        <Search className="w-8 h-8 text-pink-300" />
                    </div>
                    <p className="text-lg font-medium text-gray-700">
                        พิมพ์เพื่อค้นหานักเรียน
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        ค้นหาได้ทั้งชื่อ และรหัสนักเรียน
                    </p>
                </div>
            )}

            {/* No Results */}
            {query.trim() && !isSearching && results.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white/30 rounded-3xl border border-white/50 backdrop-blur-sm">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-800">
                        ไม่พบนักเรียน
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        ลองค้นหาด้วยคำอื่น หรือตรวจสอบตัวสะกด
                    </p>
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-4 animate-fade-in-up">
                    {/* Limit Indicator */}
                    {results.length === 50 && (
                        <div className="bg-yellow-50/80 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm backdrop-blur-sm">
                            <span className="text-2xl mt-0.5">⚠️</span>
                            <div className="flex-1">
                                <p className="font-bold text-yellow-800">
                                    แสดง 50 รายการแรก
                                </p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    พิมพ์ชื่อให้ชัดเจนขึ้นเพื่อค้นหาที่แม่นยำยิ่งขึ้น
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Results Count */}
                    <div className="flex items-center justify-between px-2">
                        <div className="text-sm text-gray-500 font-medium">
                            ผลการค้นหา
                        </div>
                        <div className="text-sm text-pink-600 font-bold bg-pink-50 px-3 py-1 rounded-full">
                            พบ {results.length} รายการ
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {results.map((student) => {
                            const latestResult = student.phqResults[0];
                            const risk = latestResult
                                ? riskConfig[
                                      latestResult.riskLevel as RiskLevel
                                  ]
                                : null;

                            return (
                                <button
                                    key={student.id}
                                    onClick={() =>
                                        handleStudentClick(student.id)
                                    }
                                    className="w-full p-4 bg-white hover:bg-pink-50/30 rounded-2xl border border-gray-100 hover:border-pink-200 transition-all text-left group shadow-sm hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden"
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform duration-300">
                                                {student.firstName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 group-hover:text-pink-700 transition-colors text-lg">
                                                    {student.firstName}{" "}
                                                    {student.lastName}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
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

                                        {risk && (
                                            <div
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${risk.bgColor} ${risk.textColor} border border-white/50`}
                                            >
                                                {risk.label}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
