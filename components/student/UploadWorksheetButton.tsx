"use client";

import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { uploadWorksheet } from "@/lib/actions/activity";
import { useRouter } from "next/navigation";

interface UploadWorksheetButtonProps {
    activityProgressId: string;
    disabled?: boolean;
    variant?: "primary" | "secondary";
    fullWidth?: boolean;
}

export function UploadWorksheetButton({
    activityProgressId,
    disabled = false,
    variant = "primary",
    fullWidth = false,
}: UploadWorksheetButtonProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const result = await uploadWorksheet(activityProgressId, formData);

            if (result.success) {
                // Refresh the page to show updated data
                router.refresh();
            } else {
                alert(result.error || "เกิดข้อผิดพลาดในการอัปโหลด");
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("เกิดข้อผิดพลาดในการอัปโหลด");
        } finally {
            setUploading(false);
            e.target.value = ""; // Reset input
        }
    };

    const isPrimary = variant === "primary";

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="hidden"
                disabled={disabled || uploading}
            />
            <button
                onClick={handleUploadClick}
                disabled={disabled || uploading}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    fullWidth ? "w-full" : ""
                } ${
                    isPrimary
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                } ${
                    disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:shadow-md"
                }`}
            >
                {uploading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        กำลังอัปโหลด...
                    </>
                ) : (
                    <>
                        <Upload className="w-4 h-4" />
                        {isPrimary ? "upload ใบงาน" : "อัปโหลดเพิ่ม"}
                    </>
                )}
            </button>
        </>
    );
}
