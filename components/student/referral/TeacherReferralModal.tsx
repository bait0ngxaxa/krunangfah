"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { UserCheck, AlertTriangle, Loader2, Send, Users } from "lucide-react";
import {
    getTeachersForReferral,
    createStudentReferral,
} from "@/lib/actions/referral.actions";
import { toast } from "sonner";
import type { TeacherPickerOption } from "@/types/referral.types";

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-9999 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-lg my-8 shadow-2xl border border-white/50 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-[#0BD0D9] px-5 py-4 sm:px-8 sm:py-6 rounded-t-3xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-[#09B8C0]/50 to-emerald-500/30" />
                    <h3 className="text-2xl font-bold text-white relative z-10 flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-white" />
                        ส่งต่อนักเรียน
                    </h3>
                    <p className="text-white/80 text-sm mt-1 relative z-10">
                        {studentName}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6">
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
                                กำลังโหลดรายชื่อครู...
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
                                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
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
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedTeacherId}
                            className="flex-1 px-6 py-3 bg-[#0BD0D9] text-white rounded-xl hover:shadow-md hover:bg-[#09B8C0] hover:-translate-y-0.5 transition-all font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังส่งต่อ...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    ส่งต่อ
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
