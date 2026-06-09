"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type {
    ImportResult,
    ImportStudentSummary,
} from "@/lib/actions/student/types";

interface ImportResultDialogProps {
    result: ImportResult | null;
    onClose: () => void;
}

function StudentResultList({
    students,
    emptyText,
    tone,
}: {
    students: ImportStudentSummary[];
    emptyText: string;
    tone: "success" | "error";
}) {
    const toneClass =
        tone === "success"
            ? "border-emerald-100 bg-emerald-50/70 text-emerald-800"
            : "border-red-100 bg-red-50/70 text-red-800";

    if (students.length === 0) {
        return (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-center">
                <p className="text-sm text-gray-500">{emptyText}</p>
            </div>
        );
    }

    return (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {students.map((student, index) => (
                <li
                    key={`${student.studentId}-${student.class}-${index}`}
                    className={`rounded-xl border px-3 py-2.5 text-sm ${toneClass}`}
                >
                    <p className="break-words font-semibold">
                        {student.fullName} ({student.studentId})
                    </p>
                    <p className="break-words text-xs opacity-80">
                        ห้อง {student.class}
                    </p>
                    {student.reason && (
                        <p className="mt-1 break-words text-xs">
                            {student.reason}
                        </p>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function ImportResultDialog({
    result,
    onClose,
}: ImportResultDialogProps) {
    useEffect(() => {
        if (!result || result.status !== "partial") {
            return;
        }

        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose, result]);

    if (!result || result.status !== "partial") {
        return null;
    }

    const importedStudents = result.importedStudents ?? [];
    const failedStudents = result.failedStudents ?? [];

    const modal = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
            style={{ overscrollBehavior: "contain" }}
            onClick={onClose}
        >
            <div
                className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-4xl animate-in grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.65)] fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-3rem)]"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="import-result-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="border-b border-amber-100 bg-amber-50 px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start gap-3 pr-9">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                            <h3
                                id="import-result-title"
                                className="break-words text-base font-bold text-amber-800"
                            >
                                นำเข้าข้อมูลสำเร็จบางส่วน
                            </h3>
                            <p className="mt-1 break-words text-sm text-amber-700">
                                {result.message}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="ปิดหน้าต่างผลการนำเข้า"
                        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-amber-800 transition-base hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    <div className="grid gap-4">
                        <div className="grid grid-cols-1 gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-sm sm:grid-cols-2">
                            <div>
                                <span className="block text-xs text-amber-700">
                                    นำเข้าสำเร็จ
                                </span>
                                <span className="font-bold text-gray-800">
                                    {result.imported ?? 0} คน
                                </span>
                            </div>
                            <div>
                                <span className="block text-xs text-amber-700">
                                    ไม่ได้นำเข้า
                                </span>
                                <span className="font-bold text-gray-800">
                                    {failedStudents.length} คน
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <section className="min-w-0 space-y-3">
                                <div className="flex items-center gap-2 text-emerald-700">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    <h4 className="break-words font-bold">
                                        รายการที่นำเข้าสำเร็จ
                                    </h4>
                                </div>
                            <StudentResultList
                                students={importedStudents}
                                emptyText="ไม่มีรายชื่อนักเรียนที่นำเข้าสำเร็จ"
                                tone="success"
                            />
                            </section>
                            <section className="min-w-0 space-y-3">
                                <div className="flex items-center gap-2 text-red-700">
                                    <AlertTriangle className="h-5 w-5 shrink-0" />
                                    <h4 className="break-words font-bold">
                                        รายการที่นำเข้าไม่ผ่าน
                                    </h4>
                                </div>
                            <StudentResultList
                                students={failedStudents}
                                emptyText="ไม่มีรายชื่อนักเรียนที่นำเข้าไม่ผ่าน"
                                tone="error"
                            />
                            </section>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end border-t border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="primary"
                        size="md"
                        className="min-w-28"
                    >
                        รับทราบ
                    </Button>
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined") {
        return modal;
    }

    return createPortal(modal, document.body);
}
