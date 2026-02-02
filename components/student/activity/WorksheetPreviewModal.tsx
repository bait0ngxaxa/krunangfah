"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import Image from "next/image";

interface WorksheetPreviewModalProps {
    fileUrl: string;
    fileName: string;
}

export function WorksheetPreviewModal({
    fileUrl,
    fileName,
}: WorksheetPreviewModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    const isPdf = fileUrl.toLowerCase().endsWith(".pdf");

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-xs font-medium hover:bg-green-600 transition-colors shrink-0"
            >
                <Eye className="w-3 h-3" />
                พรีวิว
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-bold text-gray-800 truncate">
                                {fileName}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[70vh]">
                            {isPdf ? (
                                <iframe
                                    src={fileUrl}
                                    className="w-full h-[60vh]"
                                    title="PDF Preview"
                                />
                            ) : (
                                <Image
                                    src={fileUrl}
                                    alt={fileName}
                                    width={800}
                                    height={600}
                                    className="w-full h-auto"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
