"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = "ยืนยัน",
    cancelLabel = "ยกเลิก",
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            style={{ overscrollBehavior: "contain" }}
            onClick={onCancel}
        >
            <div
                className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.65)] backdrop-blur-xl"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-gray-200 bg-white px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h3
                                id="confirm-dialog-title"
                                className="text-base font-bold text-gray-800"
                            >
                                {title}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            variant="secondary"
                            size="md"
                            className="flex-1"
                        >
                            {cancelLabel}
                        </Button>
                        <Button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            variant="danger"
                            size="md"
                            className="flex-1"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                                    กำลังดำเนินการ…
                                </span>
                            ) : (
                                confirmLabel
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
