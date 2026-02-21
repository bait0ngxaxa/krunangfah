import type { RefObject } from "react";
import { AlertTriangle } from "lucide-react";
import { MAX_LIST_HEIGHT } from "./constants";
import { StudentResultItem } from "./StudentResultItem";
import type { Student } from "./types";

interface SearchResultsListProps {
    results: Student[];
    scrollRef: RefObject<HTMLDivElement | null>;
    isScrollable: boolean;
    showFade: boolean;
    onStudentClick: (id: string) => void;
}

export function SearchResultsList({
    results,
    scrollRef,
    isScrollable,
    showFade,
    onStudentClick,
}: SearchResultsListProps) {
    if (results.length === 0) return null;

    return (
        <div className="space-y-3">
            {/* Limit Indicator */}
            {results.length === 50 && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 backdrop-blur-sm">
                    <AlertTriangle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-700">
                            แสดง 50 รายการแรก
                        </p>
                        <p className="text-xs text-emerald-600 mt-0.5">
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
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    พบ {results.length} รายการ
                </span>
            </div>

            {/* Results List */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-100/60 ring-1 ring-emerald-50 overflow-hidden shadow-sm">
                <div className="relative">
                    <div
                        ref={scrollRef}
                        className={isScrollable ? "overflow-y-auto" : ""}
                        style={
                            isScrollable
                                ? { maxHeight: MAX_LIST_HEIGHT }
                                : undefined
                        }
                    >
                        <div className="divide-y divide-gray-100/80">
                            {results.map((student) => (
                                <StudentResultItem
                                    key={student.id}
                                    student={student}
                                    onClick={onStudentClick}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Scroll fade indicator */}
                    {isScrollable && showFade && (
                        <div
                            className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-b from-transparent to-white pointer-events-none"
                            aria-hidden="true"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
