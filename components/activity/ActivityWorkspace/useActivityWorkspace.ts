import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { uploadWorksheet, updateTeacherNotes } from "@/lib/actions/activity";
import { ACTIVITIES, ACTIVITY_INDICES, COLOR_CONFIG } from "./constants";
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
}: Pick<
    ActivityWorkspaceProps,
    "studentId" | "riskLevel" | "activityProgress"
>): UseActivityWorkspaceReturn {
    const router = useRouter();

    // State
    const [uploading, setUploading] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
    const [teacherNotes, setTeacherNotes] = useState<string>("");
    const [savingNotes, setSavingNotes] = useState(false);

    // Computed values
    const config = COLOR_CONFIG[riskLevel];
    const activityNumbers = ACTIVITY_INDICES[riskLevel];
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

    // Handlers
    const handleDownload = (worksheetUrl: string) => {
        window.open(worksheetUrl, "_blank");
    };

    const handleUpload = async (progressId: string, file: File) => {
        setUploading(progressId);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const result = await uploadWorksheet(progressId, formData);

            if (result.success) {
                // แสดง toast success
                toast.success("อัปโหลดใบงานสำเร็จ");

                if (result.completed && result.activityNumber) {
                    // หน่วงเวลา 1.5 วินาที เพื่อให้เห็น toast ก่อน redirect
                    await new Promise((resolve) => setTimeout(resolve, 1500));

                    if (result.activityNumber === 1) {
                        // กิจกรรมที่ 1: ไป assessment ก่อน
                        router.push(
                            `/students/${studentId}/help/start/assessment?activity=${result.activityNumber}`,
                        );
                    } else {
                        // กิจกรรม 2+: ไป encouragement (จะแสดง completion page โดยตรง)
                        router.push(
                            `/students/${studentId}/help/start/encouragement?activity=${result.activityNumber}`,
                        );
                    }
                } else {
                    router.refresh();
                }
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
                router.refresh();
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
        handleDownload,
        handleFileSelect,
        handleSaveNotes,
    };
}
