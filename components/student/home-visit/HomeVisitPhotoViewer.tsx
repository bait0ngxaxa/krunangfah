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
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-9999"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10"
            >
                <X className="w-6 h-6 text-white" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/10 rounded-full text-white text-sm font-medium">
                {currentIndex + 1} / {photos.length}
            </div>

            {/* Navigation arrows */}
            {currentIndex > 0 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex((prev) => prev - 1);
                    }}
                    className="absolute left-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                    <ChevronLeft className="w-8 h-8 text-white" />
                </button>
            )}

            {currentIndex < photos.length - 1 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex((prev) => prev + 1);
                    }}
                    className="absolute right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                    <ChevronRight className="w-8 h-8 text-white" />
                </button>
            )}

            {/* Image */}
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
