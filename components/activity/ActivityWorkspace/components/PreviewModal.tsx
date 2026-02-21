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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-5xl max-h-[90vh] overflow-hidden w-full border border-white/50 animate-zoom-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-8 py-5 border-b border-emerald-100 bg-linear-to-r from-white to-emerald-50/50">
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
                        className="p-2.5 hover:bg-emerald-100/50 text-gray-500 hover:text-emerald-600 rounded-full transition-all hover:rotate-90 duration-300"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-auto max-h-[80vh] bg-gray-50/50">
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
