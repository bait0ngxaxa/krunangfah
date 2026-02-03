"use client";

import { useState } from "react";
import { createCounselingSession } from "@/lib/actions/counseling.actions";

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

    const [formData, setFormData] = useState({
        sessionDate: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD
        counselorName: "",
        summary: "",
    });

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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
                {/* Header */}
                <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-8 py-6 rounded-t-2xl">
                    <h3 className="text-2xl font-bold text-white">
                        เพิ่มบันทึกการให้คำปรึกษา
                    </h3>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="p-8 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto"
                >
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Session Date */}
                    <div>
                        <label
                            htmlFor="sessionDate"
                            className="block text-sm font-bold text-gray-700 mb-2"
                        >
                            วันที่ <span className="text-red-500">*</span>
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-colors outline-none"
                        />
                    </div>

                    {/* Counselor Name */}
                    <div>
                        <label
                            htmlFor="counselorName"
                            className="block text-sm font-bold text-gray-700 mb-2"
                        >
                            ครูที่พูดคุย <span className="text-red-500">*</span>
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-colors outline-none"
                        />
                    </div>

                    {/* Summary */}
                    <div>
                        <label
                            htmlFor="summary"
                            className="block text-sm font-bold text-gray-700 mb-2"
                        >
                            สรุปประเด็นที่พูดคุย{" "}
                            <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="summary"
                            required
                            rows={6}
                            placeholder="บันทึกสรุปประเด็นที่พูดคุย..."
                            value={formData.summary}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    summary: e.target.value,
                                })
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-colors resize-none outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            ระบุรายละเอียดการพูดคุย ปัญหาที่พบ
                            และแนวทางการช่วยเหลือ
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
