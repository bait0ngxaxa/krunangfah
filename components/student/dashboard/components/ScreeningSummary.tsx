import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { RiskGroupSection } from "../../phq/RiskGroupSection";
import type { Student, GroupedStudents, RiskLevel } from "../types";

function getStudentsByLevel(
    groupedStudents: GroupedStudents,
    level: RiskLevel,
): Student[] {
    switch (level) {
        case "red":
            return groupedStudents.red;
        case "orange":
            return groupedStudents.orange;
        case "yellow":
            return groupedStudents.yellow;
        case "green":
            return groupedStudents.green;
        case "blue":
            return groupedStudents.blue;
    }
}

interface ScreeningSummaryProps {
    displayedStudentCount: number;
    filteredStudentCount: number;
    groupedStudents: GroupedStudents;
    selectedClass: string;
    classes: string[];
    riskLevels: RiskLevel[];
    filters?: {
        schoolId?: string;
        className?: string;
        riskLevel?: string;
        referredOnly?: string;
    };
    pagination: {
        page: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    readOnly?: boolean;
}

function buildPageHref(
    filters: ScreeningSummaryProps["filters"],
    page: number,
): string {
    const searchParams = new URLSearchParams();

    if (filters?.schoolId) {
        searchParams.set("school", filters.schoolId);
    }

    if (filters?.className && filters.className !== "all") {
        searchParams.set("class", filters.className);
    }

    if (filters?.riskLevel && filters.riskLevel !== "all") {
        searchParams.set("risk", filters.riskLevel);
    }

    if (filters?.referredOnly === "true") {
        searchParams.set("referred", "true");
    }

    if (page > 1) {
        searchParams.set("page", String(page));
    }

    const queryString = searchParams.toString();
    return queryString ? `/students?${queryString}` : "/students";
}

export function ScreeningSummary({
    displayedStudentCount,
    filteredStudentCount,
    groupedStudents,
    selectedClass,
    classes,
    riskLevels,
    filters,
    pagination,
    readOnly = false,
}: ScreeningSummaryProps) {
    return (
        <div className="space-y-5">
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/80 ring-1 ring-slate-900/5 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-emerald-200/30 to-green-300/20 rounded-full blur-2xl pointer-events-none opacity-60" />

                <div className="px-5 py-4 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-linear-to-br from-violet-50 to-fuchsia-50 rounded-xl border border-violet-100 shadow-sm text-violet-600">
                            <ClipboardCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight">
                                สรุปผลการคัดกรอง
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {selectedClass === "all"
                                    ? classes.length === 1
                                        ? `ห้อง ${classes[0]}`
                                        : "ทุกห้องเรียน"
                                    : `ห้อง ${selectedClass}`}
                            </p>
                        </div>
                    </div>
                    <span className="bg-violet-50 text-violet-700 text-xs font-bold px-3.5 py-1.5 rounded-full border border-violet-100 shadow-sm">
                        {displayedStudentCount} / {filteredStudentCount} คน
                    </span>
                </div>
            </div>

            {riskLevels.map((level) => (
                <RiskGroupSection
                    key={level}
                    level={level}
                    students={getStudentsByLevel(groupedStudents, level)}
                    readOnly={readOnly}
                />
            ))}

            {pagination.totalPages > 1 ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-slate-500">
                        หน้า {pagination.page} จาก {pagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        {pagination.hasPreviousPage ? (
                            <Link
                                href={buildPageHref(filters, pagination.page - 1)}
                                scroll={false}
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
                            >
                                ก่อนหน้า
                            </Link>
                        ) : (
                            <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                                ก่อนหน้า
                            </span>
                        )}

                        {pagination.hasNextPage ? (
                            <Link
                                href={buildPageHref(filters, pagination.page + 1)}
                                scroll={false}
                                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
                            >
                                ถัดไป
                            </Link>
                        ) : (
                            <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                                ถัดไป
                            </span>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
