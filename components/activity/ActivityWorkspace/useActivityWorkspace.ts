import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    uploadWorksheet,
    updateTeacherNotes,
    deleteWorksheetUpload,
    confirmActivityComplete,
} from "@/lib/actions/activity";
import { compressImage } from "@/lib/utils/image-compression";
import { MAX_FILE_SIZE } from "@/lib/actions/activity/constants";
import {
    ACTIVITIES,
    getWorksheetActivityIndices,
    getWorkspaceColorConfig,
} from "./constants";
import type {
    ActivityWorkspaceProps,
    UseActivityWorkspaceReturn,
    PreviewFile,
} from "./types";

/**
 * Custom hook for managing ActivityWorkspace state and logic
 */
export function useActivityWorkspace({
    studentId,
    riskLevel,
    activityProgress,
    phqResultId,
}: Pick<
    ActivityWorkspaceProps,
    "studentId" | "riskLevel" | "activityProgress" | "phqResultId"
>): UseActivityWorkspaceReturn {
    const router = useRouter();

    // State
    const [uploading, setUploading] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
    const [teacherNotes, setTeacherNotes] = useState<string>("");
    const [savingNotes, setSavingNotes] = useState(false);

    // Computed values
    const config = getWorkspaceColorConfig(riskLevel);
    const activityNumbers = getWorksheetActivityIndices(riskLevel);
    const activities = activityNumbers
        .map((num) => ACTIVITIES.find((a) => a.number === num))
        .filter((a): a is NonNullable<typeof a> => a !== undefined);

    const currentProgress = activityProgress.find(
        (p) => p.status !== "completed",
    );
    const currentActivityNumber =
        currentProgress?.activityNumber || activityNumbers[0];
    const currentActivity = ACTIVITIES.find(
        (a) => a.number === currentActivityNumber,
    );

    // Initialize teacher notes from current progress
    useEffect(() => {
        if (currentProgress?.teacherNotes) {
            setTeacherNotes(currentProgress.teacherNotes);
        }
    }, [currentProgress]);

    const handleUpload = async (progressId: string, file: File) => {
        setUploading(progressId);
        try {
            const processedFile = await compressImage(file);

            if (processedFile.size > MAX_FILE_SIZE) {
                toast.error("ไฟล์ใหญ่เกินไป (สูงสุด 10MB)");
                setUploading(null);
                return;
            }

            const formData = new FormData();
            formData.append("file", processedFile);

            const result = await uploadWorksheet(progressId, formData);

            if (result.success) {
                toast.success("อัปโหลดใบงานสำเร็จ");
                router.refresh();
            } else {
                toast.error(result.error || "เกิดข้อผิดพลาดในการอัปโหลด");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("เกิดข้อผิดพลาดในการอัปโหลด");
        } finally {
            setUploading(null);
        }
    };

    const handleConfirmComplete = async () => {
        if (!currentProgress) return;

        try {
            const result = await confirmActivityComplete(currentProgress.id);
            if (result.success && result.activityNumber) {
                const phqParam = phqResultId
                    ? `&phqResultId=${phqResultId}`
                    : "";

                if (result.activityNumber === 1) {
                    router.push(
                        `/students/${studentId}/help/start/assessment?activity=${result.activityNumber}${phqParam}`,
                    );
                } else {
                    router.push(
                        `/students/${studentId}/help/start/encouragement?activity=${result.activityNumber}${phqParam}`,
                    );
                }
            } else {
                toast.error(result.error || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("Confirm complete error:", error);
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const handleFileSelect = (progressId: string) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,.pdf";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                handleUpload(progressId, file);
            }
        };
        input.click();
    };

    const handleDeleteUpload = async (uploadId: string) => {
        try {
            const result = await deleteWorksheetUpload(uploadId);
            if (result.success) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error("Delete upload error:", error);
            toast.error("เกิดข้อผิดพลาดในการลบไฟล์");
        }
    };

    const handleSaveNotes = async () => {
        if (!currentProgress) return;

        setSavingNotes(true);
        try {
            const result = await updateTeacherNotes(
                currentProgress.id,
                teacherNotes,
            );

            if (result.success) {
                toast.success("บันทึกโน๊ตสำเร็จ");
                setTeacherNotes("");
            } else {
                toast.error(result.error || "เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch (error) {
            console.error("Save notes error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSavingNotes(false);
        }
    };

    return {
        // State
        uploading,
        previewFile,
        setPreviewFile,
        teacherNotes,
        setTeacherNotes,
        savingNotes,

        // Computed values
        config,
        activityNumbers,
        activities,
        currentProgress,
        currentActivityNumber,
        currentActivity,

        // Handlers
        handleFileSelect,
        handleDeleteUpload,
        handleConfirmComplete,
        handleSaveNotes,
    };
}
