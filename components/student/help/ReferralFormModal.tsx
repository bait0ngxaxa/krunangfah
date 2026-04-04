"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Hospital,
    AlertTriangle,
    Loader2,
    Save,
    ClipboardCheck,
    X,
} from "lucide-react";
import { updateHospitalReferral } from "@/lib/actions/hospital-referral.actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

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
        initialStatus ? "refer" : "follow_up",
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
                        : "บันทึกการติดตามต่อแล้ว",
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
            className="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
            style={{ overscrollBehavior: "contain" }}
            onClick={onClose}
        >
            <div
                className="my-4 flex max-h-[92vh] w-full max-w-lg animate-fade-in-up flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:my-8"
                role="dialog"
                aria-modal="true"
                aria-labelledby="referralform-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-gray-200 bg-white px-5 py-5 sm:px-8 sm:py-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3
                                id="referralform-modal-title"
                                className="flex items-center gap-3 text-2xl font-bold text-gray-900"
                            >
                                <Hospital className="w-6 h-6 text-emerald-600" />
                                ส่งต่อหรือติดตาม
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                เลือกแนวทางดูแลต่อและบันทึกผลการตัดสินใจ
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
                            เลือกการดำเนินการ
                        </label>

                        {/* Refer to Hospital */}
                        <label
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-base ${
                                selectedOption === "refer"
                                    ? "border-emerald-400 bg-emerald-50 shadow-md"
                                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                        >
                            <input
                                type="radio"
                                name="referralOption"
                                value="refer"
                                checked={selectedOption === "refer"}
                                onChange={() => setSelectedOption("refer")}
                                className="w-5 h-5 text-emerald-500 accent-emerald-500"
                            />
                            <div className="flex items-center gap-3">
                                <Hospital
                                    className={`w-6 h-6 shrink-0 ${
                                        selectedOption === "refer"
                                            ? "text-emerald-500"
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
                            <div className="ml-9 pl-4 border-l-2 border-emerald-200">
                                <label
                                    htmlFor="hospitalName"
                                    className="block text-sm font-bold text-gray-700 mb-2"
                                >
                                    ชื่อโรงพยาบาล{" "}
                                    <span className="text-emerald-500">*</span>
                                </label>
                                <input
                                    id="hospitalName"
                                    type="text"
                                    name="hospitalName"
                                    autoComplete="organization"
                                    value={hospitalName}
                                    onChange={(e) =>
                                        setHospitalName(e.target.value)
                                    }
                                    placeholder="เช่น โรงพยาบาลศิริราช"
                                    maxLength={200}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-base text-gray-800 placeholder:text-gray-400"
                                />
                            </div>
                        )}

                        {/* Follow Up */}
                        <label
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-base ${
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
                            variant="primary"
                            size="lg"
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังบันทึก…
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    บันทึก
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
