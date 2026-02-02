"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Eye, X } from "lucide-react";

interface WorksheetUpload {
    id: string;
    fileName: string;
    fileUrl: string;
}

interface WorksheetPreviewButtonProps {
    uploads: WorksheetUpload[];
    isCompleted: boolean;
}

export function WorksheetPreviewButton({
    uploads,
    isCompleted,
}: WorksheetPreviewButtonProps) {
    const [previewFile, setPreviewFile] = useState<{
        url: string;
        name: string;
    } | null>(null);

    if (!isCompleted || uploads.length === 0) {
        return (
            <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    isCompleted
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                }`}
            >
                {isCompleted ? (
                    <>
                        <span className="w-3 h-3">✓</span>
                        เสร็จแล้ว
                    </>
                ) : (
                    "กำลังทำ"
                )}
            </span>
        );
    }

    return (
        <>
            {/* Preview Modal */}
            {previewFile &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4"
                        onClick={() => setPreviewFile(null)}
                    >
                        <div
                            className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="font-bold text-gray-800 truncate">
                                    {previewFile.name}
                                </h3>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-auto max-h-[70vh]">
                                {previewFile.url
                                    .toLowerCase()
                                    .endsWith(".pdf") ? (
                                    <iframe
                                        src={previewFile.url}
                                        className="w-full h-[60vh]"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <div className="relative w-full min-h-[400px]">
                                        <Image
                                            src={previewFile.url}
                                            alt={previewFile.name}
                                            width={800}
                                            height={600}
                                            className="w-full h-auto rounded-lg"
                                            unoptimized
                                            onError={(_e) => {
                                                console.error(
                                                    "Image failed to load:",
                                                    previewFile.url,
                                                );
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}

            {/* File List */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <span className="w-3 h-3">✓</span>
                    เสร็จแล้ว
                </span>
                {uploads.map((upload, index) => (
                    <button
                        key={upload.id}
                        onClick={() =>
                            setPreviewFile({
                                url: upload.fileUrl,
                                name: upload.fileName,
                            })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-xs font-medium"
                    >
                        <Eye className="w-3 h-3" />
                        ใบงานที่ {index + 1}
                    </button>
                ))}
            </div>
        </>
    );
}
