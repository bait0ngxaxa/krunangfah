"use client";

import { useState } from "react";
import { Eye, X, FileText, ImageIcon } from "lucide-react";
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm hover:shadow-md shrink-0 group"
            >
                <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                ดูใบงาน
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-5xl max-h-[90vh] overflow-hidden w-full border-2 border-emerald-100 animate-zoom-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-8 py-5 border-b-2 border-emerald-100 bg-emerald-50">
                            <h3 className="font-bold text-gray-800 truncate flex items-center gap-3 text-lg">
                                <span className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
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
                                className="p-2.5 hover:bg-emerald-100/50 text-gray-500 hover:text-emerald-600 rounded-full transition-all hover:rotate-90 duration-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 overflow-auto max-h-[80vh] bg-gray-50/50">
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
