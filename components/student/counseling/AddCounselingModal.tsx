"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    MessageCircle,
    AlertTriangle,
    Info,
    Loader2,
    Save,
} from "lucide-react";
import { createCounselingSession } from "@/lib/actions/counseling.actions";
import { toast } from "sonner";

interface AddCounselingModalProps {
    studentId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddCounselingModal({
    studentId,
    onClose,
    onSuccess,
}: AddCounselingModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const [formData, setFormData] = useState({
        sessionDate: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD
        counselorName: "",
        summary: "",
    });

    // Ensure component is mounted before rendering portal
    useEffect(() => {
        setMounted(true);
        // Prevent body scroll when modal is open
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await createCounselingSession({
                studentId,
                sessionDate: new Date(formData.sessionDate),
                counselorName: formData.counselorName,
                summary: formData.summary,
            });

            if (result.success) {
                toast.success("บันทึกข้อมูลการพูดคุยเรียบร้อยแล้ว");
                onSuccess();
                onClose();
            } else {
                setError(result.message || "เกิดข้อผิดพลาด");
            }
        } catch (_err) {
            setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Prevent SSR issues - only render on client after mount
    if (!mounted) {
        return null;
    }

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-9999 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-2xl my-8 shadow-2xl border border-white/50 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-linear-to-r from-emerald-500 to-teal-600 px-5 py-4 sm:px-8 sm:py-6 rounded-t-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
                    <h3 className="text-2xl font-bold text-white relative z-10 flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 text-white" />
                        เพิ่มบันทึกการให้คำปรึกษา
                    </h3>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1"
                >
                    {/* Error Message */}
                    {error && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Session Date */}
                    <div>
                        <label
                            htmlFor="sessionDate"
                            className="block text-sm font-bold text-gray-700 mb-2"
                        >
                            วันที่ <span className="text-emerald-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="sessionDate"
                            required
                            value={formData.sessionDate}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    sessionDate: e.target.value,
                                })
                            }
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-all outline-none font-medium"
                        />
                    </div>

                    {/* Counselor Name */}
                    <div>
                        <label
                            htmlFor="counselorName"
                            className="block text-sm font-bold text-gray-700 mb-2"
                        >
                            ครูที่พูดคุย{" "}
                            <span className="text-emerald-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="counselorName"
                            required
                            placeholder="ระบุชื่อครูที่พูดคุย"
                            value={formData.counselorName}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    counselorName: e.target.value,
                                })
                            }
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-all outline-none font-medium"
                        />
                    </div>

                    {/* Summary */}
                    <div>
                        <label
                            htmlFor="summary"
                            className="block text-sm font-bold text-gray-700 mb-2"
                        >
                            สรุปประเด็นที่พูดคุย{" "}
                            <span className="text-emerald-500">*</span>
                        </label>
                        <textarea
                            id="summary"
                            required
                            rows={4}
                            placeholder="บันทึกสรุปประเด็นที่พูดคุย..."
                            value={formData.summary}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    summary: e.target.value,
                                })
                            }
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-all resize-none outline-none font-medium"
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Info className="w-4 h-4 text-gray-400 shrink-0" />
                            ระบุรายละเอียดการพูดคุย ปัญหาที่พบ
                            และแนวทางการช่วยเหลือ
                        </p>
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
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    บันทึกข้อมูล
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
