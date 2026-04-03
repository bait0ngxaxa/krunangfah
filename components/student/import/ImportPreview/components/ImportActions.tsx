import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { IncompleteActivityInfo } from "@/lib/actions/student/types";
import { Button } from "@/components/ui/Button";

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
}: ImportActionsProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSaveClick = () => {
        setShowConfirm(true);
    };

    const handleConfirm = () => {
        setShowConfirm(false);
        onSave();
    };

    const handleCancelConfirm = () => {
        setShowConfirm(false);
    };

    return (
        <div className="space-y-4 pt-4">
            {/* Confirmation Panel */}
            {showConfirm && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-3 flex-1">
                            <p className="font-bold text-gray-800">
                                ยืนยันการนำเข้าข้อมูล
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div className="bg-white/80 rounded-xl px-3 py-2 border border-amber-200">
                                    <span className="text-gray-500 block text-xs">
                                        ปีการศึกษา
                                    </span>
                                    <span className="font-bold text-gray-800">
                                        {academicYearLabel || "ยังไม่ได้เลือก"}
                                    </span>
                                </div>
                                <div className="bg-white/80 rounded-xl px-3 py-2 border border-amber-200">
                                    <span className="text-gray-500 block text-xs">
                                        รอบการประเมิน
                                    </span>
                                    <span className="font-bold text-gray-800">
                                        ครั้งที่ {assessmentRound}
                                    </span>
                                </div>
                                <div className="bg-white/80 rounded-xl px-3 py-2 border border-amber-200">
                                    <span className="text-gray-500 block text-xs">
                                        จำนวนนักเรียน
                                    </span>
                                    <span className="font-bold text-gray-800">
                                        {studentCount} คน
                                    </span>
                                </div>
                            </div>

                            {/* Incomplete Activity Warning */}
                            {incompleteWarning?.hasIncomplete && (
                                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                                        <p className="font-bold text-red-700 text-sm">
                                            ⚠️ พบนักเรียน{" "}
                                            {incompleteWarning.studentCount} คน
                                            ที่ยังทำกิจกรรมไม่ครบ (
                                            {incompleteWarning.activityCount}{" "}
                                            กิจกรรม) จากการประเมินครั้งที่{" "}
                                            {incompleteWarning.previousRound}
                                        </p>
                                    </div>
                                    <p className="text-xs text-red-600 ml-7">
                                        เมื่อนำเข้าข้อมูลใหม่แล้ว
                                        จะไม่สามารถย้อนกลับไปทำกิจกรรมเดิมได้
                                        กรุณาตรวจสอบให้แน่ใจก่อนยืนยัน
                                    </p>
                                </div>
                            )}

                            <p className="text-xs text-amber-700">
                                กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนกดยืนยัน
                                เมื่อนำเข้าแล้วจะไม่สามารถยกเลิกได้
                            </p>
                            <div className="flex gap-3 justify-end">
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
            <div className="flex justify-end gap-4">
                <Button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    variant="secondary"
                    size="lg"
                    className="rounded-2xl px-8"
                >
                    ยกเลิก
                </Button>
                <Button
                    type="button"
                    onClick={handleSaveClick}
                    disabled={!canSave || isLoading || showConfirm}
                    variant="primary"
                    size="lg"
                    className="rounded-2xl px-8 active:scale-[0.98]"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                            กำลังนำเข้า...
                        </>
                    ) : (
                        <>
                            <span>ตรวจสอบและนำเข้า →</span>
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
