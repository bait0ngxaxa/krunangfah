"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, X, ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/utils/image-compression";
import {
    uploadHomeVisitPhoto,
    deleteHomeVisitPhoto,
} from "@/lib/actions/home-visit-photo.actions";
import type { HomeVisitPhotoData } from "@/lib/actions/home-visit.actions";
import { HomeVisitPhotoViewer } from "./HomeVisitPhotoViewer";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

interface HomeVisitPhotoUploaderProps {
    homeVisitId: string;
    photos: HomeVisitPhotoData[];
    onPhotosChange: (photos: HomeVisitPhotoData[]) => void;
    readOnly?: boolean;
}

const MAX_PHOTOS = 5;

export function HomeVisitPhotoUploader({
    homeVisitId,
    photos,
    onPhotosChange,
    readOnly = false,
}: HomeVisitPhotoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset value so selecting the same file triggers onChange again.
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        setUploading(true);
        try {
            // Compress before upload to cap payload size and improve UX.
            const compressed = await compressImage(file);

            const formData = new FormData();
            formData.append("file", compressed);

            const result = await uploadHomeVisitPhoto(homeVisitId, formData);

            if (result.success && result.photo) {
                onPhotosChange([
                    ...photos,
                    {
                        id: result.photo.id,
                        fileName: result.photo.fileName,
                        fileUrl: result.photo.fileUrl,
                        fileType: compressed.type,
                        fileSize: compressed.size,
                    },
                ]);
                toast.success("อัปโหลดรูปภาพสำเร็จ");
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (photoId: string) => {
        if (!confirm("ต้องการลบรูปภาพนี้หรือไม่?")) return;

        const result = await deleteHomeVisitPhoto(photoId);
        if (result.success) {
            onPhotosChange(photos.filter((p) => p.id !== photoId));
            toast.success("ลบรูปภาพสำเร็จ");
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
                รูปภาพ ({photos.length}/{MAX_PHOTOS})
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {photos.map((photo, index) => (
                    <div
                        key={photo.id}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-200 group cursor-pointer"
                        onClick={() => setViewerIndex(index)}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photo.fileUrl}
                            alt={photo.fileName}
                            className="w-full h-full object-cover"
                        />
                        {!readOnly && (
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(photo.id);
                                }}
                                aria-label="ลบรูปภาพ"
                                variant="danger"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                ))}

                {!readOnly && photos.length < MAX_PHOTOS && (
                    <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        variant="secondary"
                        size="md"
                        className="aspect-square h-auto border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/50 flex flex-col gap-1"
                    >
                        {uploading ? (
                            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                        ) : (
                            <>
                                <Camera className="w-6 h-6 text-emerald-400" />
                                <span className="text-xs text-emerald-600 font-medium">
                                    เพิ่มรูป
                                </span>
                            </>
                        )}
                    </Button>
                )}

                {photos.length === 0 && readOnly && (
                    <div className="col-span-full flex flex-col items-center justify-center py-6 text-gray-400">
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-sm">ไม่มีรูปภาพ</span>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                className="hidden"
            />

            {viewerIndex !== null && (
                <HomeVisitPhotoViewer
                    photos={photos}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerIndex(null)}
                />
            )}
        </div>
    );
}
