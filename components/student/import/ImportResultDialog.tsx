"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
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
        return <p className="text-sm text-gray-500">{emptyText}</p>;
    }

    return (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {students.map((student, index) => (
                <li
                    key={`${student.studentId}-${student.class}-${index}`}
                    className={`rounded-xl border p-3 text-sm ${toneClass}`}
                >
                    <p className="font-semibold">
                        {student.fullName} ({student.studentId})
                    </p>
                    <p className="text-xs opacity-80">ห้อง {student.class}</p>
                    {student.reason && (
                        <p className="mt-1 text-xs">{student.reason}</p>
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
    if (!result || result.status !== "partial") {
        return null;
    }

    const importedStudents = result.importedStudents ?? [];
    const failedStudents = result.failedStudents ?? [];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            style={{ overscrollBehavior: "contain" }}
        >
            <div
                className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.65)]"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="import-result-title"
            >
                <div className="border-b border-amber-100 bg-amber-50 px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <h3
                                id="import-result-title"
                                className="text-base font-bold text-amber-800"
                            >
                                นำเข้าข้อมูลสำเร็จบางส่วน
                            </h3>
                            <p className="mt-1 text-sm text-amber-700">
                                {result.message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="space-y-5 px-6 py-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-emerald-700">
                                <CheckCircle2 className="h-5 w-5" />
                                <h4 className="font-bold">
                                    นำเข้าสำเร็จ {result.imported ?? 0} คน
                                </h4>
                            </div>
                            <StudentResultList
                                students={importedStudents}
                                emptyText="ไม่มีรายชื่อนักเรียนที่นำเข้าสำเร็จ"
                                tone="success"
                            />
                        </section>
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-red-700">
                                <AlertTriangle className="h-5 w-5" />
                                <h4 className="font-bold">
                                    ไม่ได้นำเข้า {failedStudents.length} คน
                                </h4>
                            </div>
                            <StudentResultList
                                students={failedStudents}
                                emptyText="ไม่มีรายชื่อนักเรียนที่นำเข้าไม่ผ่าน"
                                tone="error"
                            />
                        </section>
                    </div>
                    <div className="flex justify-end border-t border-gray-100 pt-5">
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
        </div>
    );
}
