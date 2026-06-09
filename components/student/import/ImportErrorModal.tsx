"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ImportErrorModalProps {
    error: string | null;
    title: string;
    description: string;
    onClose: () => void;
}

interface StructuredImportError {
    summary: string | null;
    items: string[];
    visibleItems: string[];
    hiddenCount: number;
}

const MAX_VISIBLE_ERROR_ITEMS = 12;

function parseImportError(error: string): StructuredImportError {
    const lines = error
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length <= 1) {
        return {
            summary: lines[0] ?? null,
            items: [],
            visibleItems: [],
            hiddenCount: 0,
        };
    }

    const [firstLine, ...restLines] = lines;
    const hasSummary = !/^(?:[-*]|\d+[.)]|แถวที่|row\s+\d+)/i.test(firstLine);
    const items = hasSummary ? restLines : lines;
    const visibleItems = items.slice(0, MAX_VISIBLE_ERROR_ITEMS);

    return {
        summary: hasSummary ? firstLine : null,
        items,
        visibleItems,
        hiddenCount: Math.max(items.length - visibleItems.length, 0),
    };
}

/**
 * Blocking error modal for failed student imports.
 */
export function ImportErrorModal({
    error,
    title,
    description,
    onClose,
}: ImportErrorModalProps) {
    useEffect(() => {
        if (!error) {
            return;
        }

        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [error, onClose]);

    if (!error) {
        return null;
    }

    const errorDetails = parseImportError(error);

    const modal = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
            style={{ overscrollBehavior: "contain" }}
            onClick={onClose}
        >
            <div
                className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-xl animate-in grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-red-100 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.65)] fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-3rem)]"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="import-error-title"
                aria-describedby="import-error-message"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="border-b border-red-100 bg-red-50 px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start gap-3 pr-9">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="min-w-0">
                            <h3
                                id="import-error-title"
                                className="break-words text-base font-bold text-red-700"
                            >
                                {title}
                            </h3>
                            <p className="mt-1 break-words text-sm text-red-600">
                                {description}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="ปิดหน้าต่างแจ้งข้อผิดพลาด"
                        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-700 transition-base hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="min-h-0 overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
                    <div
                        id="import-error-message"
                        className="max-h-full min-h-24 overflow-y-auto rounded-xl border border-red-100 bg-red-50/70 p-4 text-sm leading-6 text-red-700"
                    >
                        {errorDetails.summary && (
                            <p className="break-words font-medium text-red-800">
                                {errorDetails.summary}
                            </p>
                        )}
                        {errorDetails.items.length > 0 && (
                            <div
                                className={
                                    errorDetails.summary ? "mt-3" : undefined
                                }
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-red-100 pt-3">
                                    <span className="font-semibold text-red-800">
                                        พบรายละเอียดที่ต้องแก้ไข{" "}
                                        {errorDetails.items.length} รายการ
                                    </span>
                                    {errorDetails.hiddenCount > 0 && (
                                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-red-100">
                                            แสดง{" "}
                                            {
                                                errorDetails.visibleItems
                                                    .length
                                            }{" "}
                                            รายการแรก
                                        </span>
                                    )}
                                </div>
                                <ul className="mt-3 space-y-2">
                                    {errorDetails.visibleItems.map(
                                        (item, index) => (
                                            <li
                                                key={`${index}-${item}`}
                                                className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-red-800"
                                            >
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-500">
                                                    {index + 1}
                                                </span>
                                                <span className="min-w-0 break-words">
                                                    {item}
                                                </span>
                                            </li>
                                        ),
                                    )}
                                </ul>
                                {errorDetails.hiddenCount > 0 && (
                                    <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                                        ยังมีอีก {errorDetails.hiddenCount}{" "}
                                        รายการ กรุณาแก้ไขรายการแรกๆ
                                        ก่อนแล้วลองนำเข้าใหม่
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end border-t border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="danger"
                        size="md"
                        className="min-w-28"
                    >
                        รับทราบ
                    </Button>
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined") {
        return modal;
    }

    return createPortal(modal, document.body);
}
