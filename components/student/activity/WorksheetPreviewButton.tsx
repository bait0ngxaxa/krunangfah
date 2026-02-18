"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Eye, X, Check, FileText, ImageIcon } from "lucide-react";
import { getWorksheetNames } from "@/components/activity/ActivityWorkspace/constants";

interface WorksheetUpload {
    id: string;
    fileName: string;
    fileUrl: string;
}

interface WorksheetPreviewButtonProps {
    uploads: WorksheetUpload[];
    isCompleted: boolean;
    activityNumber: number;
}

export function WorksheetPreviewButton({
    uploads,
    isCompleted,
    activityNumber,
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
                        <Check className="w-3 h-3" />
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
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                        onClick={() => setPreviewFile(null)}
                    >
                        <div
                            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-5xl max-h-[90vh] overflow-hidden w-full border border-white/50 animate-zoom-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-8 py-5 border-b border-pink-100 bg-linear-to-r from-white to-pink-50/50">
                                <h3 className="font-bold text-gray-800 truncate flex items-center gap-3 text-lg">
                                    <span className="p-2 bg-pink-100 rounded-lg text-pink-600">
                                        {previewFile.name
                                            .toLowerCase()
                                            .endsWith(".pdf")
                                            ? <FileText className="w-5 h-5" />
                                            : <ImageIcon className="w-5 h-5" />}
                                    </span>
                                    {previewFile.name}
                                </h3>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="p-2.5 hover:bg-pink-100/50 text-gray-500 hover:text-pink-600 rounded-full transition-all hover:rotate-90 duration-300"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 overflow-auto max-h-[80vh] bg-gray-50/50">
                                {previewFile.url
                                    .toLowerCase()
                                    .endsWith(".pdf") ? (
                                    <iframe
                                        src={previewFile.url}
                                        className="w-full h-[70vh] rounded-xl border border-gray-200 shadow-inner"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <div className="flex justify-center">
                                        <Image
                                            src={previewFile.url}
                                            alt={previewFile.name}
                                            width={1200}
                                            height={900}
                                            className="w-auto h-auto max-h-[70vh] rounded-xl shadow-lg"
                                            style={{ objectFit: "contain" }}
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
            <div className="flex items-center gap-3 flex-wrap justify-center">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 shadow-sm">
                    <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                    </span>
                    เสร็จแล้ว
                </span>
                {uploads.map((upload, index) => {
                    const worksheetName = getWorksheetNames(activityNumber).at(index);

                    return (
                        <button
                            key={upload.id}
                            onClick={() =>
                                setPreviewFile({
                                    url: upload.fileUrl,
                                    name: upload.fileName,
                                })
                            }
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-pink-200 text-pink-600 rounded-full hover:bg-pink-50 hover:border-pink-300 transition-all shadow-sm hover:shadow-md text-xs font-bold group"
                        >
                            <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            <span>
                                {worksheetName || `ใบงานที่ ${index + 1}`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
