"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface NamedSubmissionExportButtonProps {
    href: string;
    disabled: boolean;
}

interface WorkbookDownload {
    blob: Blob;
    filename: string;
}

interface ExportButtonState {
    isExporting: boolean;
    errorMessage: string | null;
    handleExport: () => Promise<void>;
}

const FALLBACK_EXPORT_FILENAME = "รายชื่อผลคัดกรอง.xlsx";
const GENERIC_EXPORT_ERROR = "ไม่สามารถส่งออกรายชื่อได้";
const EXPORT_TIMEOUT_ERROR =
    "ใช้เวลาส่งออกนานเกินไป กรุณาปรับตัวกรองให้แคบลงแล้วลองใหม่";
const EMPTY_EXPORT_ERROR =
    "ไฟล์ส่งออกว่าง กรุณาปรับตัวกรองแล้วลองใหม่";
const UNEXPECTED_FILE_ERROR =
    "ไฟล์ส่งออกไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
const EXPORT_TIMEOUT_MS = 120_000;
const XLSX_CONTENT_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_FILENAME_LENGTH = 180;
const FORBIDDEN_FILENAME_CHARS = /[\u0000-\u001f\u007f<>:"/\\|?*]+/g;
const REPEATED_DASHES = /-+/g;

export function getNamedSubmissionErrorMessage(value: unknown): string {
    if (
        typeof value === "object" &&
        value !== null &&
        "error" in value &&
        typeof value.error === "string" &&
        value.error.trim().length > 0
    ) {
        return value.error.trim();
    }

    return GENERIC_EXPORT_ERROR;
}

function getStatusErrorMessage(status: number): string {
    switch (status) {
        case 400:
            return "ตัวกรองไม่ถูกต้อง กรุณาปรับตัวกรองแล้วลองใหม่";
        case 401:
            return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
        case 403:
            return "บัญชีนี้ไม่มีสิทธิ์ส่งออกรายชื่อ";
        case 404:
            return "ไม่พบข้อมูลผลคัดกรองตามตัวกรองที่เลือก";
        case 429:
            return "มีการส่งออกถี่เกินไป กรุณารอสักครู่แล้วลองใหม่";
        default:
            return GENERIC_EXPORT_ERROR;
    }
}

export async function getNamedSubmissionDownloadError(
    response: Response,
): Promise<string> {
    try {
        const contentType = response.headers.get("Content-Type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
            return getStatusErrorMessage(response.status);
        }

        const message = getNamedSubmissionErrorMessage(await response.json());
        return message === GENERIC_EXPORT_ERROR
            ? getStatusErrorMessage(response.status)
            : message;
    } catch {
        return getStatusErrorMessage(response.status);
    }
}

function sanitizeDownloadFilename(filename: string): string {
    const safeSegment = filename.split(/[\\/]/).at(-1) ?? "";
    const cleanName = safeSegment
        .replace(FORBIDDEN_FILENAME_CHARS, "-")
        .replace(REPEATED_DASHES, "-")
        .trim();
    if (cleanName.length === 0) return FALLBACK_EXPORT_FILENAME;

    const withExtension = cleanName.toLowerCase().endsWith(".xlsx")
        ? cleanName
        : `${cleanName}.xlsx`;

    return withExtension.length > MAX_FILENAME_LENGTH
        ? `${withExtension.slice(0, MAX_FILENAME_LENGTH - 5)}.xlsx`
        : withExtension;
}

export function getNamedSubmissionDownloadFilename(
    contentDisposition: string | null,
): string {
    const encodedMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
        try {
            return sanitizeDownloadFilename(decodeURIComponent(encodedMatch[1]));
        } catch {
            return FALLBACK_EXPORT_FILENAME;
        }
    }

    const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
    if (filenameMatch?.[1]) {
        return sanitizeDownloadFilename(filenameMatch[1]);
    }

    return FALLBACK_EXPORT_FILENAME;
}

export function getNamedSubmissionWorkbookValidationMessage(
    response: Response,
    blob: Blob,
): string | null {
    if (blob.size === 0) return EMPTY_EXPORT_ERROR;

    const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const looksLikeWorkbook =
        contentType.length === 0 ||
        contentType.includes(XLSX_CONTENT_TYPE) ||
        contentType.includes("application/octet-stream") ||
        disposition.toLowerCase().includes(".xlsx");

    return looksLikeWorkbook ? null : UNEXPECTED_FILE_ERROR;
}

export function getNamedSubmissionFailureMessage(error: unknown): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
    ) {
        return EXPORT_TIMEOUT_ERROR;
    }

    return GENERIC_EXPORT_ERROR;
}

function downloadWorkbook(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

async function fetchNamedSubmissionWorkbook(
    href: string,
    signal: AbortSignal,
): Promise<WorkbookDownload | string> {
    const response = await fetch(href, { cache: "no-store", signal });
    if (!response.ok) return getNamedSubmissionDownloadError(response);

    const blob = await response.blob();
    const validationMessage = getNamedSubmissionWorkbookValidationMessage(
        response,
        blob,
    );
    if (validationMessage) return validationMessage;

    return {
        blob,
        filename: getNamedSubmissionDownloadFilename(
            response.headers.get("Content-Disposition"),
        ),
    };
}

function useNamedSubmissionExport({
    href,
    disabled,
}: NamedSubmissionExportButtonProps): ExportButtonState {
    const [isExporting, setIsExporting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const exportInFlightRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            abortControllerRef.current?.abort();
        };
    }, []);

    const setSafeErrorMessage = (message: string): void => {
        if (mountedRef.current) {
            setErrorMessage(message);
        }
    };

    const finishExport = (
        controller: AbortController,
        timeoutId: number,
    ): void => {
        window.clearTimeout(timeoutId);
        if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
        }
        exportInFlightRef.current = false;
        if (mountedRef.current) setIsExporting(false);
    };

    const handleExport = async (): Promise<void> => {
        if (disabled || exportInFlightRef.current) return;

        const controller = new AbortController();
        const timeoutId = window.setTimeout(
            () => controller.abort(),
            EXPORT_TIMEOUT_MS,
        );
        exportInFlightRef.current = true;
        abortControllerRef.current = controller;
        setIsExporting(true);
        setErrorMessage(null);

        try {
            const result = await fetchNamedSubmissionWorkbook(
                href,
                controller.signal,
            );
            if (typeof result === "string") {
                setSafeErrorMessage(result);
                return;
            }

            downloadWorkbook(result.blob, result.filename);
        } catch (error) {
            setSafeErrorMessage(getNamedSubmissionFailureMessage(error));
        } finally {
            finishExport(controller, timeoutId);
        }
    };

    return { isExporting, errorMessage, handleExport };
}

export function NamedSubmissionExportButton({
    href,
    disabled,
}: NamedSubmissionExportButtonProps) {
    const disabledReasonId = useId();
    const errorMessageId = useId();
    const { isExporting, errorMessage, handleExport } =
        useNamedSubmissionExport({ href, disabled });
    const describedBy = errorMessage
        ? errorMessageId
        : disabled
          ? disabledReasonId
          : undefined;

    return (
        <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
            <Button
                type="button"
                variant="primary"
                size="sm"
                className="w-full whitespace-nowrap sm:w-auto"
                disabled={disabled || isExporting}
                aria-busy={isExporting}
                aria-describedby={describedBy}
                title={
                    disabled
                        ? "ไม่มีข้อมูลผลคัดกรองตามตัวกรองที่เลือก"
                        : undefined
                }
                onClick={handleExport}
            >
                {isExporting ? (
                    <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                    />
                ) : (
                    <Download
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                    />
                )}
                <span>{isExporting ? "กำลังส่งออก..." : "ส่งออกรายชื่อ"}</span>
            </Button>
            {disabled && !errorMessage ? (
                <p
                    id={disabledReasonId}
                    className="max-w-64 text-right text-xs text-gray-600"
                >
                    ไม่มีข้อมูลสำหรับส่งออกตามตัวกรองนี้
                </p>
            ) : null}
            {errorMessage ? (
                <p
                    id={errorMessageId}
                    className="max-w-64 text-right text-xs text-red-600"
                    role="alert"
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
