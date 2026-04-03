"use client";

import { useState } from "react";
import { Eye, X, FileText, ImageIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

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
            <Button
                onClick={() => setIsOpen(true)}
                variant="secondary"
                size="md"
                className="shrink-0 group"
            >
                <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                ดูใบงาน
            </Button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="my-4 flex max-h-[92vh] w-full max-w-5xl animate-zoom-in flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:my-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-8 sm:py-5">
                            <h3 className="font-bold text-gray-800 truncate flex items-center gap-3 text-lg">
                                <span className="p-2 rounded-lg bg-white border border-emerald-200 text-emerald-600 shadow-sm">
                                    {isPdf ? (
                                        <FileText className="w-5 h-5" />
                                    ) : (
                                        <ImageIcon className="w-5 h-5" />
                                    )}
                                </span>
                                {fileName}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-full p-2.5 text-gray-500 transition-all duration-300 hover:rotate-90 hover:bg-gray-100 hover:text-gray-700"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto bg-gray-50/50 p-6">
                            {isPdf ? (
                                <iframe
                                    src={fileUrl}
                                    className="w-full h-[70vh] rounded-xl border border-gray-200 shadow-inner"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="flex justify-center">
                                    <Image
                                        src={fileUrl}
                                        alt={fileName}
                                        width={1200}
                                        height={900}
                                        className="w-auto h-auto max-h-[70vh] rounded-xl shadow-lg"
                                        style={{ objectFit: "contain" }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
