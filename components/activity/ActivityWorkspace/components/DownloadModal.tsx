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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 relative border border-white/50 animate-zoom-in">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <h3 className="text-xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    เลือกใบงาน
                </h3>
                <p className="text-sm text-gray-600 mb-8 font-medium">
                    กิจกรรมที่ {activityNumber}
                </p>

                {/* Download Buttons */}
                <div className="space-y-4">
                    {downloadUrls.map((url, index) => (
                        <button
                            key={url}
                            onClick={() => handleDownload(url)}
                            className="w-full py-4 px-6 bg-linear-to-r from-blue-500 via-cyan-500 to-teal-400 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-cyan-200 hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-3 group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">
                                📄
                            </span>
                            <span className="text-lg">
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
                    className="mt-6 w-full py-3 text-gray-500 hover:text-gray-800 font-bold transition-colors hover:bg-gray-50 rounded-xl"
                >
                    ปิด
                </button>
            </div>
        </div>
    );
}
