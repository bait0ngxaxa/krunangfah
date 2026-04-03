"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, X, Loader2 } from "lucide-react";
import { updateScheduledDate } from "@/lib/actions/activity/mutations";

interface ScheduleDateSectionProps {
    activityProgressId: string;
    currentDate: Date | string | null;
    isLocked: boolean;
}

function formatDateThai(date: Date | string): string {
    return new Date(date).toLocaleDateString("th-TH", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function toInputDateValue(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Section for selecting/editing the scheduled appointment date
 * within the ActivityWorkspace page.
 */
export function ScheduleDateSection({
    activityProgressId,
    currentDate,
    isLocked,
}: ScheduleDateSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [dateValue, setDateValue] = useState(
        currentDate ? toInputDateValue(currentDate) : "",
    );
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSave = (): void => {
        if (!dateValue) return;
        startTransition(async () => {
            const result = await updateScheduledDate(
                activityProgressId,
                dateValue,
            );
            if (result.success) {
                setIsEditing(false);
                router.refresh();
            }
        });
    };

    const handleCancel = (): void => {
        setDateValue(currentDate ? toInputDateValue(currentDate) : "");
        setIsEditing(false);
    };

    return (
        <div className="mb-6 rounded-2xl border border-gray-200/80 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
                        <CalendarDays className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-gray-700">
                            วันนัดหมาย
                        </span>
                        {!isEditing && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                {isLocked
                                    ? "กิจกรรมยังล็อคอยู่"
                                    : currentDate
                                      ? formatDateThai(currentDate)
                                      : "ยังไม่ได้นัดหมาย"}
                            </p>
                        )}
                    </div>
                </div>

                {isLocked ? (
                    <span className="text-xs text-gray-400 italic">
                        ไม่สามารถนัดหมายได้
                    </span>
                ) : isEditing ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateValue}
                            onChange={(e) => setDateValue(e.target.value)}
                            className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            disabled={isPending}
                        />
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isPending || !dateValue}
                            className="rounded-lg bg-cyan-500 p-1.5 text-white shadow-sm transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title="บันทึก"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isPending}
                            className="p-1.5 rounded-lg bg-white text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors shadow-sm border border-red-200"
                            title="ยกเลิก"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-cyan-700 shadow-sm transition-colors hover:border-cyan-200 hover:bg-cyan-50"
                    >
                        <CalendarDays className="w-3.5 h-3.5" />
                        {currentDate ? "เปลี่ยนวัน" : "เลือกวันนัดหมาย"}
                    </button>
                )}
            </div>
        </div>
    );
}
