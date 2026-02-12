"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Hospital,
    AlertTriangle,
    Loader2,
    Save,
    ClipboardCheck,
} from "lucide-react";
import { updateHospitalReferral } from "@/lib/actions/hospital-referral.actions";
import { toast } from "sonner";

type ReferralOption = "refer" | "follow_up";

interface ReferralFormModalProps {
    phqResultId: string;
    initialStatus: boolean;
    initialHospitalName?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function ReferralFormModal({
    phqResultId,
    initialStatus,
    initialHospitalName,
    onClose,
    onSuccess,
}: ReferralFormModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [selectedOption, setSelectedOption] = useState<ReferralOption>(
        initialStatus ? "refer" : "follow_up"
    );
    const [hospitalName, setHospitalName] = useState(initialHospitalName ?? "");

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError(null);

        const shouldRefer = selectedOption === "refer";

        // Client-side validation: require hospital name when referring
        if (shouldRefer && !hospitalName.trim()) {
            setError("กรุณาระบุชื่อโรงพยาบาล");
            return;
        }

        // Skip API call if nothing changed
        if (
            shouldRefer === initialStatus &&
            hospitalName.trim() === (initialHospitalName ?? "")
        ) {
            toast.success("บันทึกข้อมูลเรียบร้อยแล้ว");
            onSuccess();
            onClose();
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await updateHospitalReferral({
                phqResultId,
                referredToHospital: shouldRefer,
                hospitalName: shouldRefer ? hospitalName.trim() : undefined,
            });

            if (result.success) {
                toast.success(
                    shouldRefer
                        ? "บันทึกการส่งต่อโรงพยาบาลแล้ว"
                        : "บันทึกการติดตามต่อแล้ว"
                );
                onSuccess();
                onClose();
            } else {
                setError(result.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
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
                <div className="bg-linear-to-r from-rose-500 to-pink-600 px-8 py-6 rounded-t-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
                    <h3 className="text-2xl font-bold text-white relative z-10 flex items-center gap-2">
                        <Hospital className="w-6 h-6 text-white" />
                        ส่งต่อหรือติดตาม
                    </h3>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-2 text-rose-700">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            เลือกการดำเนินการ
                        </label>

                        {/* Refer to Hospital */}
                        <label
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                selectedOption === "refer"
                                    ? "border-rose-400 bg-rose-50 shadow-md"
                                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                        >
                            <input
                                type="radio"
                                name="referralOption"
                                value="refer"
                                checked={selectedOption === "refer"}
                                onChange={() => setSelectedOption("refer")}
                                className="w-5 h-5 text-rose-500 accent-rose-500"
                            />
                            <div className="flex items-center gap-3">
                                <Hospital
                                    className={`w-6 h-6 shrink-0 ${
                                        selectedOption === "refer"
                                            ? "text-rose-500"
                                            : "text-gray-400"
                                    }`}
                                />
                                <div>
                                    <p className="font-bold text-gray-800">
                                        ส่งต่อโรงพยาบาล
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        ส่งต่อนักเรียนไปรับการดูแลจากผู้เชี่ยวชาญ
                                    </p>
                                </div>
                            </div>
                        </label>

                        {/* Hospital Name Input — shown when "refer" is selected */}
                        {selectedOption === "refer" && (
                            <div className="ml-9 pl-4 border-l-2 border-rose-200">
                                <label
                                    htmlFor="hospitalName"
                                    className="block text-sm font-bold text-gray-700 mb-2"
                                >
                                    ชื่อโรงพยาบาล <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    id="hospitalName"
                                    type="text"
                                    value={hospitalName}
                                    onChange={(e) => setHospitalName(e.target.value)}
                                    placeholder="เช่น โรงพยาบาลศิริราช"
                                    maxLength={200}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all text-gray-800 placeholder:text-gray-400"
                                />
                            </div>
                        )}

                        {/* Follow Up */}
                        <label
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                selectedOption === "follow_up"
                                    ? "border-blue-400 bg-blue-50 shadow-md"
                                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                        >
                            <input
                                type="radio"
                                name="referralOption"
                                value="follow_up"
                                checked={selectedOption === "follow_up"}
                                onChange={() => setSelectedOption("follow_up")}
                                className="w-5 h-5 text-blue-500 accent-blue-500"
                            />
                            <div className="flex items-center gap-3">
                                <ClipboardCheck
                                    className={`w-6 h-6 shrink-0 ${
                                        selectedOption === "follow_up"
                                            ? "text-blue-500"
                                            : "text-gray-400"
                                    }`}
                                />
                                <div>
                                    <p className="font-bold text-gray-800">
                                        ติดตามต่อ
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        ติดตามดูแลนักเรียนต่อเนื่องโดยครู
                                    </p>
                                </div>
                            </div>
                        </label>
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
                            className="flex-1 px-6 py-3 bg-linear-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-pink-200 hover:-translate-y-0.5 transition-all font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    บันทึก
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
