"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, X, Loader2 } from "lucide-react";
import { updateScheduledDate } from "@/lib/actions/activity/mutations";
import { cn } from "@/lib/utils/cn";

interface ScheduleDateCellProps {
    activityProgressId: string;
    currentDate: Date | null;
    isLocked: boolean;
    readOnly?: boolean;
}

function formatDateThai(date: Date): string {
    return new Date(date).toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function toInputDateValue(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function iconButtonClassName(
    tone: "confirm" | "cancel",
    disabled: boolean,
): string {
    return cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
        tone === "confirm"
            ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
        disabled && "cursor-not-allowed opacity-50 hover:bg-inherit",
    );
}

export function ScheduleDateCell({
    activityProgressId,
    currentDate,
    isLocked,
    readOnly = false,
}: ScheduleDateCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [dateValue, setDateValue] = useState(
        currentDate ? toInputDateValue(currentDate) : "",
    );
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    if (isLocked) {
        return (
            <span className="text-gray-400 italic text-sm">
                ยังไม่ได้นัดหมาย
            </span>
        );
    }

    // readOnly mode — แสดงวันที่อย่างเดียว ไม่ให้แก้ไข
    if (readOnly) {
        return currentDate ? (
            <span className="text-gray-700 font-medium text-sm">
                {formatDateThai(currentDate)}
            </span>
        ) : (
            <span className="text-gray-400 italic text-sm">
                ยังไม่ได้นัดหมาย
            </span>
        );
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-1.5">
                <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    className="border border-emerald-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36"
                    disabled={isPending}
                />
                <button
                    type="button"
                    onClick={() => {
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
                    }}
                    disabled={isPending || !dateValue}
                    className={iconButtonClassName(
                        "confirm",
                        isPending || !dateValue,
                    )}
                    title="บันทึก"
                    aria-label="บันทึกวันนัดหมาย"
                >
                    {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Check className="w-4 h-4" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setDateValue(
                            currentDate ? toInputDateValue(currentDate) : "",
                        );
                        setIsEditing(false);
                    }}
                    disabled={isPending}
                    className={iconButtonClassName("cancel", isPending)}
                    title="ยกเลิก"
                    aria-label="ยกเลิกการแก้ไขวันนัดหมาย"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="group flex items-center gap-1.5 hover:bg-emerald-50 rounded-lg px-2 py-1 transition-colors cursor-pointer"
            title="เลือกวันนัดหมาย"
        >
            {currentDate ? (
                <span className="text-gray-700 font-medium text-sm">
                    {formatDateThai(currentDate)}
                </span>
            ) : (
                <span className="text-gray-400 italic text-sm">
                    ยังไม่ได้นัดหมาย
                </span>
            )}
            <CalendarDays className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
        </button>
    );
}
