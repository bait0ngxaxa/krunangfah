"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeVisitPhotoData } from "@/lib/actions/home-visit.actions";

// SSR-safe check for document availability
const subscribe = () => () => {};
function useIsMounted(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
}

interface HomeVisitPhotoViewerProps {
    photos: HomeVisitPhotoData[];
    initialIndex: number;
    onClose: () => void;
}

export function HomeVisitPhotoViewer({
    photos,
    initialIndex,
    onClose,
}: HomeVisitPhotoViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const isMounted = useIsMounted();

    useEffect(() => {
        document.body.style.overflow = "hidden";

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft" && currentIndex > 0) {
                setCurrentIndex((prev) => prev - 1);
            }
            if (e.key === "ArrowRight" && currentIndex < photos.length - 1) {
                setCurrentIndex((prev) => prev + 1);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [currentIndex, photos.length, onClose]);

    if (!isMounted) return null;

    const currentPhoto = photos.at(currentIndex);
    if (!currentPhoto) return null;

    const content = (
        <div
            className="fixed inset-0 z-9999 flex items-center justify-center overscroll-contain bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                aria-label="ปิดตัวแสดงรูปภาพ"
                className="absolute top-4 right-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/45 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/10 rounded-full text-white text-sm font-medium">
                {currentIndex + 1} / {photos.length}
            </div>

            {currentIndex > 0 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex((prev) => prev - 1);
                    }}
                    aria-label="รูปก่อนหน้า"
                    className="absolute left-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/45 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>
            )}

            {currentIndex < photos.length - 1 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex((prev) => prev + 1);
                    }}
                    aria-label="รูปถัดไป"
                    className="absolute right-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/45 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                    <ChevronRight className="w-7 h-7" />
                </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={currentPhoto.fileUrl}
                alt={currentPhoto.fileName}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );

    return createPortal(content, document.body);
}
