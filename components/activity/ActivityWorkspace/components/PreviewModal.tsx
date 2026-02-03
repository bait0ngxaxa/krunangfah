import Image from "next/image";
import { X } from "lucide-react";
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-bold text-gray-800 truncate">
                        {file.name}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-auto max-h-[70vh]">
                    {file.url.toLowerCase().endsWith(".pdf") ? (
                        <iframe
                            src={file.url}
                            className="w-full h-[60vh]"
                            title="PDF Preview"
                        />
                    ) : (
                        <Image
                            src={file.url}
                            alt={file.name}
                            width={800}
                            height={600}
                            className="w-full h-auto"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
