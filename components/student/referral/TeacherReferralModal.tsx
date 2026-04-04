"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    UserCheck,
    AlertTriangle,
    Loader2,
    Send,
    Users,
    X,
} from "lucide-react";
import {
    getTeachersForReferral,
    createStudentReferral,
} from "@/lib/actions/referral.actions";
import { toast } from "sonner";
import type { TeacherPickerOption } from "@/types/referral.types";
import { Button } from "@/components/ui/Button";

interface TeacherReferralModalProps {
    studentId: string;
    studentName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function TeacherReferralModal({
    studentId,
    studentName,
    onClose,
    onSuccess,
}: TeacherReferralModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [teachers, setTeachers] = useState<TeacherPickerOption[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
        null,
    );

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    // Load teachers list
    useEffect(() => {
        let cancelled = false;
        async function loadTeachers(): Promise<void> {
            try {
                const result = await getTeachersForReferral();
                if (!cancelled) {
                    setTeachers(result);
                    setIsLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setError("ไม่สามารถโหลดรายชื่อครูได้");
                    setIsLoading(false);
                }
            }
        }
        void loadTeachers();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError(null);

        if (!selectedTeacherId) {
            setError("กรุณาเลือกครูที่ต้องการส่งต่อ");
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await createStudentReferral({
                studentId,
                toTeacherUserId: selectedTeacherId,
            });

            if (result.success) {
                toast.success(result.message);
                onSuccess();
                onClose();
            } else {
                setError(result.message);
            }
        } catch {
            setError("เกิดข้อผิดพลาดในการส่งต่อนักเรียน");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted) {
        return null;
    }

    const modalContent = (
        <div
            className="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
            style={{ overscrollBehavior: "contain" }}
            onClick={onClose}
        >
            <div
                className="my-4 flex max-h-[92vh] w-full max-w-lg animate-fade-in-up flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:my-8"
                role="dialog"
                aria-modal="true"
                aria-labelledby="referral-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-gray-200 bg-white px-5 py-5 sm:px-8 sm:py-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3
                                id="referral-modal-title"
                                className="flex items-center gap-3 text-2xl font-bold text-gray-900"
                            >
                                <UserCheck className="w-6 h-6 text-emerald-600" />
                                ส่งต่อนักเรียน
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {studentName}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                            aria-label="ปิดหน้าต่าง"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-8"
                >
                    {error && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            เลือกครูที่ต้องการส่งต่อ
                        </label>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-8 text-gray-400">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                กำลังโหลดรายชื่อครู…
                            </div>
                        ) : teachers.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-gray-400">
                                <Users className="w-10 h-10 mb-2 opacity-50" />
                                <p className="text-sm font-medium">
                                    ไม่พบครูในโรงเรียน
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {teachers.map((teacher) => (
                                    <label
                                        key={teacher.userId}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-base ${
                                            selectedTeacherId === teacher.userId
                                                ? "border-[#0BD0D9] bg-cyan-50 shadow-md"
                                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="selectedTeacher"
                                            value={teacher.userId}
                                            checked={
                                                selectedTeacherId ===
                                                teacher.userId
                                            }
                                            onChange={() =>
                                                setSelectedTeacherId(
                                                    teacher.userId,
                                                )
                                            }
                                            className="w-5 h-5 text-[#0BD0D9] accent-[#0BD0D9]"
                                        />
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center text-[#0BD0D9] font-bold text-sm shrink-0">
                                                {teacher.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-800 truncate">
                                                    {teacher.name}
                                                </p>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                        <Button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            variant="secondary"
                            size="lg"
                            className="flex-1"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !selectedTeacherId}
                            variant="primary"
                            size="lg"
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังส่งต่อ…
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    ส่งต่อ
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
