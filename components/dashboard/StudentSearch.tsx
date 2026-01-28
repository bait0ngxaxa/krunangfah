"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
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
            <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="พิมพ์ชื่อ, นามสกุล หรือรหัสนักเรียน..."
                    className="w-full pl-12 pr-10 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
                    </div>
                )}
            </div>

            {/* Empty State */}
            {!query.trim() && (
                <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">พิมพ์เพื่อค้นหานักเรียน</p>
                </div>
            )}

            {/* No Results */}
            {query.trim() && !isSearching && results.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">ไม่พบนักเรียน</p>
                    <p className="text-xs mt-1">ลองค้นหาด้วยคำอื่น</p>
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-3">
                    {/* Limit Indicator */}
                    {results.length === 50 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                            <span className="text-yellow-600 text-lg">⚠️</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-800">
                                    แสดง 50 รายการแรก
                                </p>
                                <p className="text-xs text-yellow-700 mt-0.5">
                                    พิมพ์ชื่อให้ชัดเจนขึ้นเพื่อค้นหาที่แม่นยำยิ่งขึ้น
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Results Count */}
                    <div className="text-sm text-gray-600 font-medium px-1">
                        พบ {results.length} รายการ
                    </div>

                    {/* Results List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
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
                                    className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all text-left group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                                                {student.firstName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
                                                    {student.firstName}{" "}
                                                    {student.lastName}
                                                </h4>
                                                <p className="text-xs text-gray-500">
                                                    ห้อง {student.class}
                                                    {student.studentId &&
                                                        ` • รหัส ${student.studentId}`}
                                                </p>
                                            </div>
                                        </div>

                                        {risk && (
                                            <div
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${risk.bgColor} ${risk.textColor}`}
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
