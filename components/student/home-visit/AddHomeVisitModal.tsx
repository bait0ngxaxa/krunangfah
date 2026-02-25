"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Home, AlertTriangle, Info, Loader2, Save, Camera } from "lucide-react";
import { createHomeVisit } from "@/lib/actions/home-visit.actions";
import type { HomeVisitPhotoData } from "@/lib/actions/home-visit.actions";
import { HomeVisitPhotoUploader } from "./HomeVisitPhotoUploader";
import { toast } from "sonner";

interface AddHomeVisitModalProps {
    studentId: string;
    onClose: () => void;
    onSuccess: () => void;
}

type ModalStep = "form" | "photos";

export function AddHomeVisitModal({
    studentId,
    onClose,
    onSuccess,
}: AddHomeVisitModalProps) {
    const [step, setStep] = useState<ModalStep>("form");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [createdVisitId, setCreatedVisitId] = useState<string | null>(null);
    const [photos, setPhotos] = useState<HomeVisitPhotoData[]>([]);

    const [formData, setFormData] = useState({
        visitDate: new Date().toISOString().split("T")[0],
        description: "",
        nextScheduledDate: "",
    });

    useEffect(() => {
        setMounted(true);
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
            const result = await createHomeVisit({
                studentId,
                visitDate: new Date(formData.visitDate),
                description: formData.description,
                nextScheduledDate: formData.nextScheduledDate
                    ? new Date(formData.nextScheduledDate)
                    : undefined,
            });

            if (result.success && result.visitId) {
                setCreatedVisitId(result.visitId);
                setStep("photos");
                toast.success("บันทึกข้อมูลการเยี่ยมบ้านเรียบร้อยแล้ว");
            } else {
                setError(result.message || "เกิดข้อผิดพลาด");
            }
        } catch {
            setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDone = () => {
        toast.success("บันทึกการเยี่ยมบ้านเสร็จสิ้น");
        onSuccess();
        onClose();
    };

    if (!mounted) return null;

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
                        {step === "form" ? (
                            <>
                                <Home className="w-6 h-6 text-white" />
                                เพิ่มบันทึกการเยี่ยมบ้าน
                            </>
                        ) : (
                            <>
                                <Camera className="w-6 h-6 text-white" />
                                เพิ่มรูปภาพ
                            </>
                        )}
                    </h3>
                </div>

                {step === "form" ? (
                    /* Step 1: Form */
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

                        {/* Visit Date */}
                        <div>
                            <label
                                htmlFor="visitDate"
                                className="block text-sm font-bold text-gray-700 mb-2"
                            >
                                วันที่เยี่ยมบ้าน{" "}
                                <span className="text-emerald-500">*</span>
                            </label>
                            <input
                                type="date"
                                id="visitDate"
                                required
                                value={formData.visitDate}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        visitDate: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-all outline-none font-medium"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label
                                htmlFor="description"
                                className="block text-sm font-bold text-gray-700 mb-2"
                            >
                                รายละเอียดการเยี่ยมบ้าน{" "}
                                <span className="text-emerald-500">*</span>
                            </label>
                            <textarea
                                id="description"
                                required
                                rows={4}
                                placeholder="บันทึกรายละเอียดการเยี่ยมบ้าน สภาพแวดล้อม ข้อสังเกต..."
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-all resize-none outline-none font-medium"
                            />
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <Info className="w-4 h-4 text-gray-400 shrink-0" />
                                ระบุสภาพที่อยู่อาศัย สภาพแวดล้อม
                                และข้อสังเกตจากการเยี่ยมบ้าน
                            </p>
                        </div>

                        {/* Next Scheduled Date */}
                        <div>
                            <label
                                htmlFor="nextScheduledDate"
                                className="block text-sm font-bold text-gray-700 mb-2"
                            >
                                นัดเยี่ยมครั้งถัดไป{" "}
                                <span className="text-gray-400 font-normal text-xs">
                                    (ไม่บังคับ)
                                </span>
                            </label>
                            <input
                                type="date"
                                id="nextScheduledDate"
                                value={formData.nextScheduledDate}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        nextScheduledDate: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-all outline-none font-medium"
                            />
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
                                        บันทึกและเพิ่มรูปภาพ
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Step 2: Photo upload */
                    <div className="p-5 sm:p-8 space-y-6">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-sm text-emerald-700 font-medium">
                                บันทึกข้อมูลเรียบร้อยแล้ว
                                เพิ่มรูปภาพการเยี่ยมบ้านได้สูงสุด 5 รูป
                            </p>
                        </div>

                        {createdVisitId && (
                            <HomeVisitPhotoUploader
                                homeVisitId={createdVisitId}
                                photos={photos}
                                onPhotosChange={setPhotos}
                            />
                        )}

                        <div className="flex gap-4 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={handleDone}
                                className="w-full px-6 py-3 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all font-bold shadow-md flex items-center justify-center gap-2"
                            >
                                เสร็จสิ้น
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
