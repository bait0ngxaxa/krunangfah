"use client";

import { type ReactNode, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useImportErrorModalEffects } from "./useImportErrorModalEffects";

interface ImportErrorModalProps {
    error?: string | null;
    title: string;
    description: string;
    onClose: () => void;
    children?: ReactNode;
    tone?: "danger" | "warning";
    open?: boolean;
}

interface StructuredImportError {
    summary: string | null;
    items: string[];
    visibleItems: string[];
    hiddenCount: number;
}

const MAX_VISIBLE_ERROR_ITEMS = 12;
const TONE_STYLES = {
    danger: {
        border: "border-red-100",
        header: "border-red-100 bg-red-50",
        iconBg: "bg-red-100",
        icon: "text-red-500",
        title: "text-red-700",
        description: "text-red-600",
        close: "text-red-700 hover:bg-red-100 focus-visible:ring-red-200",
        content: "border-red-100 bg-red-50/70 text-red-700",
        summary: "text-red-800",
        divider: "border-red-100",
        badge: "text-red-600 ring-red-100",
        item: "border-red-100 text-red-800",
        itemIndex: "bg-red-50 text-red-500",
        footer: "border-gray-100",
        buttonVariant: "danger" as const,
    },
    warning: {
        border: "border-amber-100",
        header: "border-amber-100 bg-amber-50",
        iconBg: "bg-amber-100",
        icon: "text-amber-600",
        title: "text-amber-800",
        description: "text-amber-700",
        close:
            "text-amber-800 hover:bg-amber-100 focus-visible:ring-amber-200",
        content: "border-amber-100 bg-amber-50/70 text-amber-800",
        summary: "text-amber-900",
        divider: "border-amber-100",
        badge: "text-amber-700 ring-amber-100",
        item: "border-amber-100 text-amber-900",
        itemIndex: "bg-amber-50 text-amber-600",
        footer: "border-gray-100",
        buttonVariant: "primary" as const,
    },
};

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
    children,
    tone = "danger",
    open,
}: ImportErrorModalProps) {
    const isOpen = open ?? !!error;
    const titleId = useId();
    const descriptionId = useId();
    const messageId = useId();
    const modalRef = useRef<HTMLDivElement>(null);

    useImportErrorModalEffects({ isOpen, onClose, modalRef });

    if (!isOpen) {
        return null;
    }

    const styles =
        tone === "warning" ? TONE_STYLES.warning : TONE_STYLES.danger;
    const errorDetails = error ? parseImportError(error) : null;

    const modal = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
            style={{ overscrollBehavior: "contain" }}
            onClick={onClose}
        >
            <div
                ref={modalRef}
                className={`relative grid max-h-[calc(100dvh-2rem)] w-full max-w-xl animate-in grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border ${styles.border} bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.65)] fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-3rem)]`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={`${descriptionId} ${messageId}`}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
            >
                <div
                    className={`border-b ${styles.header} px-4 py-4 sm:px-6 sm:py-5`}
                >
                    <div className="flex items-start gap-3 pr-9">
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}
                        >
                            <AlertTriangle
                                className={`h-5 w-5 ${styles.icon}`}
                            />
                        </div>
                        <div className="min-w-0">
                            <h3
                                id={titleId}
                                className={`break-words text-base font-bold ${styles.title}`}
                            >
                                {title}
                            </h3>
                            <p
                                id={descriptionId}
                                className={`mt-1 break-words text-sm ${styles.description}`}
                            >
                                {description}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="ปิดหน้าต่างแจ้งข้อผิดพลาด"
                        className={`absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-base focus-visible:outline-none focus-visible:ring-2 ${styles.close}`}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="min-h-0 overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
                    <div
                        id={messageId}
                        className={`max-h-full min-h-24 overflow-y-auto rounded-xl border p-4 text-sm leading-6 ${styles.content}`}
                    >
                        {children}
                        {!children && errorDetails?.summary && (
                            <p
                                className={`break-words font-medium ${styles.summary}`}
                            >
                                {errorDetails.summary}
                            </p>
                        )}
                        {!children && errorDetails?.items.length ? (
                            <div
                                className={
                                    errorDetails.summary ? "mt-3" : undefined
                                }
                            >
                                <div
                                    className={`flex flex-wrap items-center justify-between gap-2 border-t pt-3 ${styles.divider}`}
                                >
                                    <span
                                        className={`font-semibold ${styles.summary}`}
                                    >
                                        พบรายละเอียดที่ต้องแก้ไข{" "}
                                        {errorDetails.items.length} รายการ
                                    </span>
                                    {errorDetails.hiddenCount > 0 && (
                                        <span
                                            className={`rounded-full bg-white px-2.5 py-1 text-xs font-medium ring-1 ${styles.badge}`}
                                        >
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
                                                className={`grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 rounded-lg border bg-white px-3 py-2 ${styles.item}`}
                                            >
                                                <span
                                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${styles.itemIndex}`}
                                                >
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
                                    <p
                                        className={`mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm ring-1 ${styles.badge}`}
                                    >
                                        ยังมีอีก {errorDetails.hiddenCount}{" "}
                                        รายการ กรุณาแก้ไขรายการแรกๆ
                                        ก่อนแล้วลองนำเข้าใหม่
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
                <div
                    className={`flex justify-end border-t px-4 py-3 sm:px-6 sm:py-4 ${styles.footer}`}
                >
                    <Button
                        type="button"
                        onClick={onClose}
                        variant={styles.buttonVariant}
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
