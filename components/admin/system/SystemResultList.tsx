"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import type { SystemEntityResult } from "@/lib/actions/system-admin/types";
import { getEntityTypeLabel, getRoleLabel } from "./labels";
import { StatusBadge } from "./StatusBadge";

interface SystemResultListProps {
    results: SystemEntityResult[];
    selectedId: string | null;
    hasSearched: boolean;
    isPending: boolean;
    onSelect: (entity: SystemEntityResult) => void;
}

export function SystemResultList({
    results,
    selectedId,
    hasSearched,
    isPending,
    onSelect,
}: SystemResultListProps) {
    if (!hasSearched) {
        return <ResultMessage title="ยังไม่ได้ค้นหา" description="เริ่มจากโรงเรียน บุคลากร หรือนักเรียนที่ต้องดูแล" />;
    }

    if (isPending) {
        return <ResultSkeleton />;
    }

    if (results.length === 0) {
        return <ResultMessage title="ไม่พบข้อมูล" description="ลองใช้ชื่อ อีเมล รหัสนักเรียน หรือชื่อโรงเรียนให้เฉพาะขึ้น" />;
    }

    return (
        <div
            className="max-h-[calc(100vh-360px)] min-h-[320px] space-y-2 overflow-y-auto pr-1"
            aria-live="polite"
        >
            {results.map((entity) => (
                <button
                    key={`${entity.type}:${entity.id}`}
                    type="button"
                    onClick={() => onSelect(entity)}
                    aria-pressed={selectedId === entity.id}
                    className={`w-full rounded-xl border p-3 text-left transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 ${
                        selectedId === entity.id
                            ? "border-emerald-300 bg-emerald-50 shadow-sm"
                            : "border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
                    }`}
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold leading-5 text-gray-950">
                                {getPrimaryLabel(entity)}
                            </p>
                            <p className="mt-1 break-words text-xs leading-5 text-gray-600">
                                {getSecondaryLabel(entity)}
                            </p>
                        </div>
                        <StatusBadge>{getEntityTypeLabel(entity.type)}</StatusBadge>
                    </div>
                </button>
            ))}
        </div>
    );
}

function ResultSkeleton() {
    return (
        <div
            className="min-h-[320px] space-y-2"
            aria-label="กำลังตรวจรายการที่ตรงกับคำค้น"
            aria-live="polite"
        >
            {[0, 1, 2, 3].map((item) => (
                <div
                    key={item}
                    className="rounded-xl border border-gray-100 bg-white p-3"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-2/3 rounded-full" />
                            <Skeleton className="mt-3 h-3 w-full rounded-full" />
                        </div>
                        <Skeleton className="h-7 w-16 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ResultMessage({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
            <h2 className="text-base font-semibold text-gray-950">{title}</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-gray-600">
                {description}
            </p>
        </div>
    );
}

function getPrimaryLabel(entity: SystemEntityResult): string {
    switch (entity.type) {
        case "school":
            return entity.name;
        case "staff":
            return entity.teacherName ?? entity.name ?? entity.email;
        case "student":
            return `${entity.firstName} ${entity.lastName}`;
    }
}

function getSecondaryLabel(entity: SystemEntityResult): string {
    switch (entity.type) {
        case "school":
            return entity.province ?? "ไม่ระบุจังหวัด";
        case "staff":
            return `${getRoleLabel(entity.role, { isPrimary: entity.isPrimary })} · ${entity.email}${entity.schoolName ? ` · ${entity.schoolName}` : ""}`;
        case "student":
            return `${entity.studentId} · ${entity.class} · ${entity.schoolName}`;
    }
}
