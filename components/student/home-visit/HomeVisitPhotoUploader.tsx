"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X, ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/utils/image-compression";
import {
    IMAGE_FILE_INPUT_ACCEPT,
    MAX_IMAGE_UPLOAD_INPUT_SIZE,
    MAX_IMAGE_UPLOAD_INPUT_SIZE_MB,
} from "@/lib/constants/image-upload";
import {
    UPLOAD_ACTION_TIMEOUT_MS,
    withTimeout,
} from "@/lib/utils/with-timeout";
import { retryUpload } from "@/lib/utils/upload-retry";
import {
    uploadHomeVisitPhoto,
    deleteHomeVisitPhoto,
} from "@/lib/actions/home-visit-photo.actions";
import type { HomeVisitPhotoData } from "@/lib/actions/home-visit.actions";
import { HomeVisitPhotoViewer } from "./HomeVisitPhotoViewer";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface HomeVisitPhotoUploaderProps {
    homeVisitId: string;
    photos: HomeVisitPhotoData[];
    onPhotosChange: (photos: HomeVisitPhotoData[]) => void;
    readOnly?: boolean;
    onUploadingChange?: (isUploading: boolean) => void;
}

const MAX_PHOTOS = 5;

interface PendingHomeVisitPhotoUpload {
    file: File;
    requestId: string;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ";
}

export function HomeVisitPhotoUploader({
    homeVisitId,
    photos,
    onPhotosChange,
    readOnly = false,
    onUploadingChange,
}: HomeVisitPhotoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [pendingUpload, setPendingUpload] =
        useState<PendingHomeVisitPhotoUpload | null>(null);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [deleteDialogPhotoId, setDeleteDialogPhotoId] = useState<string | null>(
        null,
    );
    const [deletingPhoto, setDeletingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        onUploadingChange?.(uploading);
    }, [onUploadingChange, uploading]);

    const uploadPhoto = async (
        file: File,
        requestId = crypto.randomUUID(),
    ): Promise<void> => {
        if (uploading) {
            return;
        }

        if (file.size > MAX_IMAGE_UPLOAD_INPUT_SIZE) {
            toast.error(
                `ไฟล์ต้นฉบับใหญ่เกินไป (สูงสุด ${MAX_IMAGE_UPLOAD_INPUT_SIZE_MB}MB)`,
            );
            return;
        }

        setUploading(true);
        try {
            // Compress before upload to cap payload size and improve UX.
            const compressed = await compressImage(file);

            const formData = new FormData();
            formData.append("file", compressed);
            formData.append("uploadRequestId", requestId);

            const result = await retryUpload(
                () =>
                    withTimeout(
                        uploadHomeVisitPhoto(homeVisitId, formData),
                        UPLOAD_ACTION_TIMEOUT_MS,
                        "กำลังตรวจสอบสถานะการอัปโหลด",
                    ),
                ({ attempt, maxAttempts }) => {
                    toast.info(`กำลังลองอัปโหลดอีกครั้ง (${attempt}/${maxAttempts})`);
                },
            );

            if (result.success && result.photo) {
                setPendingUpload(null);
                if (!photos.some((photo) => photo.id === result.photo?.id)) {
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
                }
                toast.success("อัปโหลดรูปภาพสำเร็จ");
            } else {
                setPendingUpload(
                    result.retryable ? { file, requestId } : null,
                );
                toast.error(result.message);
            }
        } catch (error) {
            setPendingUpload({ file, requestId });
            toast.error(getErrorMessage(error));
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset value so selecting the same file triggers onChange again.
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        setPendingUpload(null);
        await uploadPhoto(file);
    };

    const handleRetryUpload = async (): Promise<void> => {
        if (!pendingUpload || uploading) {
            return;
        }

        await uploadPhoto(pendingUpload.file, pendingUpload.requestId);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDialogPhotoId) {
            return;
        }

        setDeletingPhoto(true);
        try {
            const result = await deleteHomeVisitPhoto(deleteDialogPhotoId);
            if (result.success) {
                onPhotosChange(photos.filter((p) => p.id !== deleteDialogPhotoId));
                toast.success("ลบรูปภาพสำเร็จ");
                setDeleteDialogPhotoId(null);
            } else {
                toast.error(result.message);
            }
        } finally {
            setDeletingPhoto(false);
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
                                    setDeleteDialogPhotoId(photo.id);
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

            {pendingUpload && (
                <Button
                    type="button"
                    onClick={handleRetryUpload}
                    disabled={uploading}
                    variant="secondary"
                    size="sm"
                    className="mt-3 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                >
                    ลองอัปโหลดรูปเดิมอีกครั้ง
                </Button>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept={IMAGE_FILE_INPUT_ACCEPT}
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

            <ConfirmDialog
                isOpen={deleteDialogPhotoId !== null}
                title="ยืนยันการลบรูปภาพ"
                message="ต้องการลบรูปภาพนี้หรือไม่?"
                confirmLabel="ลบรูปภาพ"
                cancelLabel="ยกเลิก"
                isLoading={deletingPhoto}
                onCancel={() => {
                    if (!deletingPhoto) {
                        setDeleteDialogPhotoId(null);
                    }
                }}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    );
}
