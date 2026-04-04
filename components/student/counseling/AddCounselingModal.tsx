"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    MessageCircle,
    AlertTriangle,
    Info,
    Loader2,
    Save,
    X,
    CalendarDays,
    User,
    FileText,
} from "lucide-react";
import { createCounselingSession } from "@/lib/actions/counseling.actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

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

    // Body scroll lock keeps focus/context inside modal while it is open.
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

    // Portal target (document.body) is available only on client.
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
                className="my-4 flex max-h-[92vh] w-full max-w-2xl animate-fade-in-up flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:my-8"
                role="dialog"
                aria-modal="true"
                aria-labelledby="counseling-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-gray-200 bg-white px-5 py-5 sm:px-8 sm:py-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3
                                id="counseling-modal-title"
                                className="flex items-center gap-3 text-2xl font-bold text-gray-900"
                            >
                                <MessageCircle className="h-6 w-6 text-emerald-600" />
                                เพิ่มบันทึกการให้คำปรึกษา
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                บันทึกรายละเอียดการพูดคุยเพื่อติดตามความคืบหน้าของนักเรียน
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

                <form
                    onSubmit={handleSubmit}
                    className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-8"
                >
                    {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-700">
                            <AlertTriangle className="h-5 w-5 shrink-0 text-orange-600" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <label
                            htmlFor="sessionDate"
                            className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-gray-700"
                        >
                            <CalendarDays className="h-4 w-4 text-emerald-600" />
                            วันที่ <span className="text-emerald-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="sessionDate"
                            name="sessionDate"
                            autoComplete="off"
                            required
                            value={formData.sessionDate}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    sessionDate: e.target.value,
                                })
                            }
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-medium text-gray-800 outline-none transition-base hover:border-emerald-300 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        />
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <label
                            htmlFor="counselorName"
                            className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-gray-700"
                        >
                            <User className="h-4 w-4 text-emerald-600" />
                            ครูที่พูดคุย{" "}
                            <span className="text-emerald-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="counselorName"
                            name="counselorName"
                            autoComplete="name"
                            required
                            placeholder="ระบุชื่อครูที่พูดคุย"
                            value={formData.counselorName}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    counselorName: e.target.value,
                                })
                            }
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-medium text-gray-800 outline-none transition-base hover:border-emerald-300 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        />
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <label
                            htmlFor="summary"
                            className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-gray-700"
                        >
                            <FileText className="h-4 w-4 text-emerald-600" />
                            สรุปประเด็นที่พูดคุย{" "}
                            <span className="text-emerald-500">*</span>
                        </label>
                        <textarea
                            id="summary"
                            name="summary"
                            autoComplete="off"
                            required
                            rows={4}
                            placeholder="บันทึกสรุปประเด็นที่พูดคุย…"
                            value={formData.summary}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    summary: e.target.value,
                                })
                            }
                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-medium text-gray-800 outline-none transition-base hover:border-emerald-300 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        />
                        <div className="mt-2 flex items-start justify-between gap-2">
                            <p className="flex items-center gap-1 text-xs text-gray-500">
                                <Info className="h-4 w-4 shrink-0 text-gray-400" />
                                ระบุปัญหาที่พบและแนวทางช่วยเหลือที่ตกลงร่วมกัน
                            </p>
                            <span className="shrink-0 text-xs font-medium text-gray-400">
                                {formData.summary.length} ตัวอักษร
                            </span>
                        </div>
                    </div>

                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-700">
                        <span className="font-semibold">คำแนะนำ:</span>{" "}
                        เขียนสรุปให้กระชับและระบุ action ที่จะติดตามในการนัดครั้งถัดไป
                    </div>

                    <div className="flex gap-4 border-t border-gray-100 pt-4">
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
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    กำลังบันทึก…
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    บันทึกข้อมูล
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
