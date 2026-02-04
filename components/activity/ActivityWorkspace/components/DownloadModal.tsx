"use client";

import { X } from "lucide-react";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                    📋 เลือกใบงาน
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                    กิจกรรมที่ {activityNumber}
                </p>

                {/* Download Buttons */}
                <div className="space-y-3">
                    {downloadUrls.map((url, index) => (
                        <button
                            key={url}
                            onClick={() => handleDownload(url)}
                            className="w-full py-4 px-6 bg-linear-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2"
                        >
                            <span className="text-lg">📄</span>
                            <span>
                                {downloadUrls.length > 1
                                    ? `ใบงาน ${index + 1}`
                                    : "ดาวน์โหลดใบงาน"}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Cancel Button */}
                <button
                    onClick={onClose}
                    className="mt-4 w-full py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                    ปิด
                </button>
            </div>
        </div>
    );
}
