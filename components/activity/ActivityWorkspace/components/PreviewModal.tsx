import { X, FileText, ImageIcon } from "lucide-react";
import type { PreviewFile } from "../types";

interface PreviewModalProps {
    file: PreviewFile | null;
    onClose: () => void;
}

/**
 * Modal for previewing uploaded files
 */
export function PreviewModal({ file, onClose }: PreviewModalProps) {
    if (!file) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="my-4 flex max-h-[92vh] w-full max-w-5xl animate-zoom-in flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:my-8"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-5">
                    <h3 className="font-bold text-gray-800 truncate flex items-center gap-3 text-lg">
                        <span className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            {file.name.toLowerCase().endsWith(".pdf") ? (
                                <FileText className="w-5 h-5" />
                            ) : (
                                <ImageIcon className="w-5 h-5" />
                            )}
                        </span>
                        {file.name}
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2.5 text-gray-500 transition-base duration-300 hover:rotate-90 hover:bg-gray-100 hover:text-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-gray-50/50 p-6">
                    {file.url.toLowerCase().endsWith(".pdf") ? (
                        <iframe
                            src={file.url}
                            className="w-full h-[70vh] rounded-xl border border-gray-200 shadow-inner"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="flex justify-center">
                            {/* ใช้ <img> เพราะไฟล์ serve ผ่าน API route ที่ต้อง auth — next/image optimization ไม่มี session */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={file.url}
                                alt={file.name}
                                className="w-auto h-auto max-h-[70vh] rounded-xl shadow-lg object-contain"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
