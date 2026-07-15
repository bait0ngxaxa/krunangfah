import { DatabaseZap } from "lucide-react";
import type { ReactElement } from "react";
import type { DataManagementSearchResult } from "@/lib/actions/data-management/types";
import type { ManagedTargetType } from "./types";

export function getNextTargetType(
    results: DataManagementSearchResult,
    currentTargetType: "all" | ManagedTargetType,
): "all" | ManagedTargetType {
    if (currentTargetType !== "all") return currentTargetType;
    if (results.schoolHasMore && results.studentHasMore) return "all";
    return results.schoolHasMore ? "school" : "student";
}

export function mergeSearchResults(
    current: DataManagementSearchResult,
    next: DataManagementSearchResult,
    loadedTargetType: "all" | ManagedTargetType,
): DataManagementSearchResult {
    return {
        schools:
            loadedTargetType === "student"
                ? current.schools
                : [...current.schools, ...next.schools],
        students:
            loadedTargetType === "school"
                ? current.students
                : [...current.students, ...next.students],
        schoolNextCursor:
            loadedTargetType === "student"
                ? current.schoolNextCursor
                : next.schoolNextCursor,
        studentNextCursor:
            loadedTargetType === "school"
                ? current.studentNextCursor
                : next.studentNextCursor,
        schoolHasMore:
            loadedTargetType === "student"
                ? current.schoolHasMore
                : next.schoolHasMore,
        studentHasMore:
            loadedTargetType === "school"
                ? current.studentHasMore
                : next.studentHasMore,
    };
}

export function EmptySelection(): ReactElement {
    return (
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
            <DatabaseZap className="h-10 w-10 text-emerald-500" />
            <h2 className="mt-3 text-lg font-bold text-gray-800">
                เลือกข้อมูลเพื่อจัดการ
            </h2>
            <p className="mt-1 max-w-xs text-sm text-gray-600">
                ค้นหาแล้วเลือกโรงเรียนหรือนักเรียนเพื่อดูผลกระทบและ action ที่ทำได้
            </p>
        </div>
    );
}
