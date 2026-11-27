"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Users,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type {
    ImportResult,
    ImportStudentSummary,
} from "@/lib/actions/student/types";
import type { ImportCompletionContext } from "./completion";

interface ImportResultDialogProps {
    result: ImportResult | null;
    context: ImportCompletionContext | null;
    onClose: () => void;
    onViewStudents: () => void;
    onImportMore: () => void;
    onGoHome: () => void;
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
                    {student.sourceStudentId && (
                        <p className="mt-1 break-words text-xs">
                            รหัสในไฟล์ {student.sourceStudentId} → ใช้รหัสในระบบ{" "}
                            {student.studentId}
                        </p>
                    )}
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
    context,
    onClose,
    onViewStudents,
    onImportMore,
    onGoHome,
}: ImportResultDialogProps) {
    useEffect(() => {
        if (!result) {
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

    if (!result || !context) {
        return null;
    }

    const isPartial = result.status === "partial";
    const importedStudents = result.importedStudents ?? [];
    const failedStudents = result.failedStudents ?? [];
    const classNames = context.classNames.filter(
        (className, index, names) =>
            className.trim().length > 0 && names.indexOf(className) === index,
    );
    const visibleClassNames = classNames.slice(0, 3).join(", ");
    const classLabel =
        classNames.length === 0
            ? "ไม่ระบุห้อง"
            : classNames.length > 3
              ? `${visibleClassNames} และอีก ${classNames.length - 3} ห้อง`
              : visibleClassNames;

    const modal = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
            style={{ overscrollBehavior: "contain" }}
            onClick={onClose}
        >
            <div
                className={`relative grid max-h-[calc(100dvh-2rem)] w-full max-w-4xl animate-in grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border bg-white shadow-xl fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-3rem)] ${isPartial ? "border-amber-100" : "border-emerald-100"}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="import-result-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div
                    className={`border-b px-4 py-4 sm:px-6 sm:py-5 ${isPartial ? "border-amber-100 bg-amber-50" : "border-emerald-100 bg-emerald-50"}`}
                >
                    <div className="flex items-start gap-3 pr-9">
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isPartial ? "bg-amber-100" : "bg-emerald-100"}`}
                        >
                            {isPartial ? (
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3
                                id="import-result-title"
                                className={`break-words text-base font-bold ${isPartial ? "text-amber-800" : "text-emerald-800"}`}
                            >
                                {isPartial
                                    ? "นำเข้าข้อมูลสำเร็จบางส่วน"
                                    : "นำเข้าข้อมูลสำเร็จ"}
                            </h3>
                            <p
                                className={`mt-1 break-words text-sm ${isPartial ? "text-amber-700" : "text-emerald-700"}`}
                            >
                                {result.message}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="ปิดผลการนำเข้าและอยู่หน้านำเข้า"
                        className={`absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-base focus-visible:outline-none focus-visible:ring-2 ${isPartial ? "text-amber-800 hover:bg-amber-100 focus-visible:ring-amber-200" : "text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-200"}`}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    <div className="grid gap-4">
                        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
                            <div className="flex min-w-0 items-start gap-2">
                                <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                <div className="min-w-0">
                                    <span className="block text-xs text-slate-500">
                                        ห้องเรียน
                                    </span>
                                    <span className="block break-words font-bold text-gray-800">
                                        {classLabel}
                                    </span>
                                </div>
                            </div>
                            <div className="flex min-w-0 items-start gap-2">
                                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                <div className="min-w-0">
                                    <span className="block text-xs text-slate-500">
                                        ปีการศึกษา
                                    </span>
                                    <span className="block break-words font-bold text-gray-800">
                                        {context.academicYearLabel || "ไม่ระบุ"}
                                    </span>
                                </div>
                            </div>
                            <div className="flex min-w-0 items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                <div className="min-w-0">
                                    <span className="block text-xs text-slate-500">
                                        รอบการประเมิน
                                    </span>
                                    <span className="block break-words font-bold text-gray-800">
                                        ครั้งที่ {context.assessmentRound}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div
                            className={`grid grid-cols-2 gap-3 rounded-xl border p-3 text-sm sm:grid-cols-5 ${isPartial ? "border-amber-100 bg-amber-50/60" : "border-emerald-100 bg-emerald-50/60"}`}
                        >
                            <div>
                                <span
                                    className={`block text-xs ${isPartial ? "text-amber-700" : "text-emerald-700"}`}
                                >
                                    สร้างนักเรียนใหม่
                                </span>
                                <span className="font-bold text-gray-800">
                                    {result.createdStudents ?? 0} คน
                                </span>
                            </div>
                            <div>
                                <span
                                    className={`block text-xs ${isPartial ? "text-amber-700" : "text-emerald-700"}`}
                                >
                                    อัปเดตนักเรียนเดิม
                                </span>
                                <span className="font-bold text-gray-800">
                                    {result.updatedStudents ?? 0} คน
                                </span>
                            </div>
                            <div>
                                <span
                                    className={`block text-xs ${isPartial ? "text-amber-700" : "text-emerald-700"}`}
                                >
                                    เพิ่มผล PHQ
                                </span>
                                <span className="font-bold text-gray-800">
                                    {result.phqCreated ?? result.imported ?? 0} คน
                                </span>
                            </div>
                            <div>
                                <span
                                    className={`block text-xs ${isPartial ? "text-amber-700" : "text-emerald-700"}`}
                                >
                                    ข้ามเพราะรอบซ้ำ
                                </span>
                                <span className="font-bold text-gray-800">
                                    {result.duplicateRoundsSkipped ?? 0} คน
                                </span>
                            </div>
                            <div>
                                <span
                                    className={`block text-xs ${isPartial ? "text-amber-700" : "text-emerald-700"}`}
                                >
                                    ข้อมูลระบุตัวตนขัดแย้ง
                                </span>
                                <span className="font-bold text-gray-800">
                                    {result.identityConflicts ?? 0} คน
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
                <div className="flex flex-col gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                    <Button
                        type="button"
                        onClick={onGoHome}
                        variant="ghost"
                        size="sm"
                        className="order-3 sm:order-1"
                    >
                        กลับหน้าหลัก
                    </Button>
                    <div className="flex flex-col gap-2 sm:order-2 sm:flex-row">
                        <Button
                            type="button"
                            onClick={onImportMore}
                            variant="secondary"
                            size="md"
                        >
                            นำเข้าไฟล์เพิ่มเติม
                        </Button>
                        <Button
                            type="button"
                            onClick={onViewStudents}
                            variant="primary"
                            size="md"
                            autoFocus
                        >
                            ดูรายชื่อนักเรียนที่นำเข้า
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined") {
        return modal;
    }

    return createPortal(modal, document.body);
}
