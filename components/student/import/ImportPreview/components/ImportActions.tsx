import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { IncompleteActivityInfo } from "@/lib/actions/student/types";
import { Button } from "@/components/ui/Button";
import type { ZeroScoreWarningInfo } from "../types";

interface ImportActionsProps {
    onCancel: () => void;
    onSave: () => void;
    isLoading: boolean;
    canSave: boolean;
    studentCount: number;
    /** Display label for the selected academic year (e.g. "2569 เทอม 1") */
    academicYearLabel: string;
    assessmentRound: number;
    incompleteWarning: IncompleteActivityInfo | null;
    zeroScoreWarning: ZeroScoreWarningInfo | null;
}

/**
 * Action buttons with two-step confirmation before import
 */
export function ImportActions({
    onCancel,
    onSave,
    isLoading,
    canSave,
    studentCount,
    academicYearLabel,
    assessmentRound,
    incompleteWarning,
    zeroScoreWarning,
}: ImportActionsProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (!showConfirm) {
            return;
        }

        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setShowConfirm(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [showConfirm]);

    const handleSaveClick = (): void => {
        if (!canSave || isLoading) {
            return;
        }

        setShowConfirm(true);
    };

    const handleConfirm = (): void => {
        if (!canSave || isLoading) {
            setShowConfirm(false);
            return;
        }

        setShowConfirm(false);
        onSave();
    };

    const handleCancelConfirm = (): void => {
        setShowConfirm(false);
    };

    return (
        <div className="space-y-4 pt-4">
            {/* Confirmation Modal */}
            {showConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
                    style={{ overscrollBehavior: "contain" }}
                    onClick={handleCancelConfirm}
                >
                    <div
                        className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.65)]"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="import-confirm-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="border-b border-amber-100 bg-amber-50 px-5 py-5 sm:px-6">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                    <h3
                                        id="import-confirm-title"
                                        className="text-base font-bold text-amber-800"
                                    >
                                        ยืนยันการนำเข้าข้อมูล
                                    </h3>
                                    <p className="mt-1 break-words text-sm text-amber-700">
                                        กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนกดยืนยัน
                                        เมื่อนำเข้าแล้วจะไม่สามารถยกเลิกได้
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4 px-5 py-5 sm:px-6">
                            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
                                    <span className="block text-xs text-gray-500">
                                        ปีการศึกษา
                                    </span>
                                    <span className="block break-words font-bold text-gray-800">
                                        {academicYearLabel || "ยังไม่ได้เลือก"}
                                    </span>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
                                    <span className="block text-xs text-gray-500">
                                        รอบการประเมิน
                                    </span>
                                    <span className="font-bold text-gray-800">
                                        ครั้งที่ {assessmentRound}
                                    </span>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
                                    <span className="block text-xs text-gray-500">
                                        จำนวนนักเรียน
                                    </span>
                                    <span className="font-bold text-gray-800">
                                        {studentCount} คน
                                    </span>
                                </div>
                            </div>

                            {incompleteWarning?.hasIncomplete && (
                                <div className="space-y-2 rounded-xl border-2 border-red-300 bg-red-50 p-4">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
                                        <p className="break-words text-sm font-bold text-red-700">
                                            พบนักเรียน{" "}
                                            {incompleteWarning.studentCount} คน
                                            ที่ยังทำกิจกรรมไม่ครบ (
                                            {incompleteWarning.activityCount}{" "}
                                            กิจกรรม) จากการประเมินครั้งที่{" "}
                                            {incompleteWarning.previousRound}
                                        </p>
                                    </div>
                                    <p className="ml-7 break-words text-xs text-red-600">
                                        เมื่อนำเข้าข้อมูลใหม่แล้ว
                                        จะไม่สามารถย้อนกลับไปทำกิจกรรมเดิมได้
                                        กรุณาตรวจสอบให้แน่ใจก่อนยืนยัน
                                    </p>
                                </div>
                            )}

                            {zeroScoreWarning && (
                                <div className="space-y-2 rounded-xl border-2 border-amber-400 bg-amber-100 p-4">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                        <div className="space-y-2">
                                            <p className="break-words text-sm font-bold text-amber-800">
                                                พบนักเรียน{" "}
                                                {zeroScoreWarning.studentCount}{" "}
                                                คนที่คะแนนข้อ 1-9 เป็น 0
                                                ทั้งหมด
                                                กรุณาตรวจสอบอีกครั้งว่าเด็กตั้งใจทำแบบประเมินแล้ว
                                            </p>
                                            <ul className="space-y-1 text-xs text-amber-800">
                                                {zeroScoreWarning.examples.map(
                                                    (student) => (
                                                        <li
                                                            key={`${student.studentId}-${student.class}`}
                                                            className="break-words"
                                                        >
                                                            {student.studentId ||
                                                                "-"}{" "}
                                                            -{" "}
                                                            {student.fullName}{" "}
                                                            ({student.class})
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                            {zeroScoreWarning.studentCount >
                                                zeroScoreWarning.examples
                                                    .length && (
                                                <p className="text-xs text-amber-700">
                                                    และอีก{" "}
                                                    {zeroScoreWarning.studentCount -
                                                        zeroScoreWarning
                                                            .examples.length}{" "}
                                                    คน
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    onClick={handleCancelConfirm}
                                    variant="secondary"
                                    size="sm"
                                    className="px-5 py-2"
                                >
                                    กลับไปแก้ไข
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={!canSave || isLoading}
                                    variant="primary"
                                    size="sm"
                                    className="px-5 py-2"
                                >
                                    ยืนยันนำเข้าข้อมูล
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Action Buttons */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    variant="secondary"
                    size="lg"
                    className="px-8"
                >
                    ยกเลิก
                </Button>
                <Button
                    type="button"
                    onClick={handleSaveClick}
                    disabled={!canSave || isLoading || showConfirm}
                    variant="primary"
                    size="lg"
                    className="px-8 active:scale-[0.98]"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                            กำลังนำเข้า…
                        </>
                    ) : (
                        <>
                            <span>ตรวจสอบและนำเข้า</span>
                            <span className="bg-black/10 px-2 py-0.5 rounded-lg text-sm">
                                {studentCount} คน
                            </span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
