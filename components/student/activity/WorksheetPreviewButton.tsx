"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Eye, X, Check, FileText, ImageIcon } from "lucide-react";
import { getWorksheetNames } from "@/components/activity/ActivityWorkspace/constants";
import { Button } from "@/components/ui/Button";

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
                        className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-slate-950/55 p-4 backdrop-blur-sm animate-fade-in"
                        onClick={() => setPreviewFile(null)}
                    >
                        <div
                            className="my-4 flex max-h-[92vh] w-full max-w-5xl animate-zoom-in flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:my-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-8 sm:py-5">
                                <h3 className="font-bold text-gray-800 truncate flex items-center gap-3 text-lg">
                                    <span className="p-2 rounded-lg bg-white border border-emerald-200 text-emerald-600 shadow-sm">
                                        {previewFile.name
                                            .toLowerCase()
                                            .endsWith(".pdf") ? (
                                            <FileText className="w-5 h-5" />
                                        ) : (
                                            <ImageIcon className="w-5 h-5" />
                                        )}
                                    </span>
                                    {previewFile.name}
                                </h3>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    aria-label="ปิดหน้าต่างพรีวิวไฟล์"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-base duration-300 hover:rotate-90 hover:bg-gray-100 hover:text-gray-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="min-h-0 flex-1 overflow-auto bg-gray-50/50 p-6">
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
                    const worksheetName =
                        getWorksheetNames(activityNumber).at(index);

                    return (
                        <Button
                            key={upload.id}
                            onClick={() =>
                                setPreviewFile({
                                    url: upload.fileUrl,
                                    name: upload.fileName,
                                })
                            }
                            variant="secondary"
                            size="sm"
                            className="rounded-full px-4 py-1.5 text-xs group"
                        >
                            <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            <span>
                                {worksheetName || `ใบงานที่ ${index + 1}`}
                            </span>
                        </Button>
                    );
                })}
            </div>
        </>
    );
}
