"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { updateStudentStatus } from "@/lib/actions/student/mutations";

const STUDENT_STATUS_OPTIONS = [
    { value: "ACTIVE", label: "กำลังศึกษา" },
    { value: "RESIGNED", label: "ลาออก" },
    { value: "TRANSFERRED", label: "ย้ายออก" },
    { value: "GRADUATED", label: "เรียนจบ" },
] as const;

type StatusValue = (typeof STUDENT_STATUS_OPTIONS)[number]["value"];

interface StatusStyle {
    badge: string;
    dot: string;
}

const STATUS_STYLES: Record<StatusValue, StatusStyle> = {
    ACTIVE: {
        badge: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
        dot: "bg-emerald-500",
    },
    RESIGNED: {
        badge: "border-rose-200 bg-rose-50/80 text-rose-700",
        dot: "bg-rose-500",
    },
    TRANSFERRED: {
        badge: "border-amber-200 bg-amber-50/80 text-amber-700",
        dot: "bg-amber-500",
    },
    GRADUATED: {
        badge: "border-blue-200 bg-blue-50/80 text-blue-700",
        dot: "bg-blue-500",
    },
};

const FALLBACK_STYLE: StatusStyle = {
    badge: "border-gray-200 bg-gray-50 text-gray-600",
    dot: "bg-gray-400",
};

function getStatusLabel(status: string): string {
    return (
        STUDENT_STATUS_OPTIONS.find((opt) => opt.value === status)?.label ??
        status
    );
}

function getStatusStyle(status: string): StatusStyle {
    return STATUS_STYLES[status as StatusValue] ?? FALLBACK_STYLE;
}

interface StudentStatusControlProps {
    studentId: string;
    currentStatus: string;
    canEdit?: boolean;
}

export function StudentStatusControl({
    studentId,
    currentStatus,
    canEdit = false,
}: StudentStatusControlProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(currentStatus);
    const [isPending, startTransition] = useTransition();

    const style = getStatusStyle(currentStatus);
    const hasChanged = selectedStatus !== currentStatus;

    function handleSave(): void {
        if (!hasChanged || isPending) return;

        startTransition(async () => {
            const result = await updateStudentStatus(
                studentId,
                selectedStatus,
            );
            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            setIsEditing(false);
            router.refresh();
        });
    }

    function handleCancel(): void {
        setSelectedStatus(currentStatus);
        setIsEditing(false);
    }

    // Badge view (default)
    if (!isEditing) {
        return (
            <div className="flex items-center gap-2">
                <span
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold shadow-sm ${style.badge}`}
                >
                    <span
                        className={`inline-block h-2 w-2 rounded-full ${style.dot}`}
                    />
                    {getStatusLabel(currentStatus)}
                </span>
                {canEdit && (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 shadow-sm transition-all hover:border-emerald-300 hover:text-emerald-600 hover:shadow-md"
                        aria-label="แก้ไขสถานะ"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        );
    }

    // Edit view
    return (
        <div className="rounded-2xl border border-emerald-200 bg-white/90 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">
                    เปลี่ยนสถานะนักเรียน
                </span>
                <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label="ยกเลิก"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
                <select
                    id="student-status"
                    value={selectedStatus}
                    onChange={(event) =>
                        setSelectedStatus(event.target.value)
                    }
                    className="min-h-9 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    disabled={isPending}
                >
                    {STUDENT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasChanged || isPending}
                    className="min-h-9 rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                    {isPending ? "กำลังบันทึก..." : "บันทึก"}
                </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-400">
                ลาออก/ย้ายออก จะปรับจำนวนนักเรียนที่นับในปีการศึกษาปัจจุบัน
            </p>
        </div>
    );
}
