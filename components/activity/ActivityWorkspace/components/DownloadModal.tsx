"use client";

import { X, ClipboardList, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    activityNumber: number;
    downloadUrls: string[];
}

/**
 * Modal for selecting which worksheet to download
 */
export function DownloadModal({
    isOpen,
    onClose,
    activityNumber,
    downloadUrls,
}: DownloadModalProps) {
    if (!isOpen) return null;

    const handleDownload = (url: string) => {
        window.open(url, "_blank");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-fade-in">
            <div className="my-4 w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl animate-zoom-in sm:my-8">
                {/* Close Button */}
                <div className="flex items-start justify-between border-b border-gray-200 bg-white px-6 py-5">
                    <div>
                        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                            <ClipboardList className="w-6 h-6 text-emerald-600" />
                            เลือกใบงาน
                        </h3>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            กิจกรรมที่ {activityNumber}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Download Buttons */}
                    <div className="space-y-4">
                        {downloadUrls.map((url, index) => (
                            <Button
                                key={url}
                                onClick={() => handleDownload(url)}
                                variant="primary"
                                size="lg"
                                fullWidth
                                className="group"
                            >
                                <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                <span className="text-lg">
                                    {downloadUrls.length > 1
                                        ? `ใบงาน ${index + 1}`
                                        : "ดาวน์โหลดใบงาน"}
                                </span>
                            </Button>
                        ))}
                    </div>

                    {/* Cancel Button */}
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        size="lg"
                        fullWidth
                        className="mt-4"
                    >
                        ปิด
                    </Button>
                </div>
            </div>
        </div>
    );
}
