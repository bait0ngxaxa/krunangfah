"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Home,
    AlertTriangle,
    Info,
    Loader2,
    Save,
    Camera,
    X,
} from "lucide-react";
import { createHomeVisit } from "@/lib/actions/home-visit.actions";
import type { HomeVisitPhotoData } from "@/lib/actions/home-visit.actions";
import { HomeVisitPhotoUploader } from "./HomeVisitPhotoUploader";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

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
            className="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
            style={{ overscrollBehavior: "contain" }}
            onClick={onClose}
        >
            <div
                className="my-4 flex max-h-[92vh] w-full max-w-2xl animate-fade-in-up flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:my-8"
                role="dialog"
                aria-modal="true"
                aria-labelledby="homevisit-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-gray-200 bg-white px-5 py-5 sm:px-8 sm:py-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3
                                id="homevisit-modal-title"
                                className="flex items-center gap-3 text-2xl font-bold text-gray-900"
                            >
                                {step === "form" ? (
                                    <>
                                        <Home className="w-6 h-6 text-emerald-600" />
                                        เพิ่มบันทึกการเยี่ยมบ้าน
                                    </>
                                ) : (
                                    <>
                                        <Camera className="w-6 h-6 text-emerald-600" />
                                        เพิ่มรูปภาพ
                                    </>
                                )}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {step === "form"
                                    ? "บันทึกรายละเอียดการเยี่ยมบ้านก่อนอัปโหลดรูปภาพ"
                                    : "อัปโหลดรูปภาพประกอบการเยี่ยมบ้าน (สูงสุด 5 รูป)"}
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

                {step === "form" ? (
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
                                name="visitDate"
                                autoComplete="off"
                                required
                                value={formData.visitDate}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        visitDate: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-base outline-none font-medium"
                            />
                        </div>

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
                                name="description"
                                autoComplete="off"
                                required
                                rows={4}
                                placeholder="บันทึกรายละเอียดการเยี่ยมบ้าน สภาพแวดล้อม ข้อสังเกต…"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-base resize-none outline-none font-medium"
                            />
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <Info className="w-4 h-4 text-gray-400 shrink-0" />
                                ระบุสภาพที่อยู่อาศัย สภาพแวดล้อม
                                และข้อสังเกตจากการเยี่ยมบ้าน
                            </p>
                        </div>

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
                                name="nextScheduledDate"
                                autoComplete="off"
                                value={formData.nextScheduledDate}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        nextScheduledDate: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-base outline-none font-medium"
                            />
                        </div>

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
                                disabled={isSubmitting}
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
                                        บันทึกและเพิ่มรูปภาพ
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-8">
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
                            <Button
                                type="button"
                                onClick={handleDone}
                                variant="primary"
                                size="lg"
                                fullWidth
                            >
                                เสร็จสิ้น
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
