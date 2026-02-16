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
    const [pendingCompletion, setPendingCompletion] = useState<number | null>(null);
    const [completedUploads, setCompletedUploads] = useState<
        { id: string; fileName: string; fileUrl: string }[]
    >([]);

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

    const handleUpload = async (progressId: string, file: File) => {
        setUploading(progressId);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const result = await uploadWorksheet(progressId, formData);

            if (result.success) {
                toast.success("อัปโหลดใบงานสำเร็จ");

                if (result.completed && result.activityNumber) {
                    // เก็บข้อมูลไฟล์ + activity number ไว้ใน state ก่อน revalidation จะเปลี่ยน data
                    const uploads = currentProgress?.worksheetUploads ?? [];
                    // เพิ่มไฟล์ที่เพิ่งอัปโหลดเข้าไปด้วย (ถ้า result มี worksheet info)
                    const lastUpload = result.worksheet
                        ? {
                              id: result.worksheet.id,
                              fileName: file.name,
                              fileUrl: result.worksheet.filePath,
                          }
                        : null;
                    setCompletedUploads(
                        lastUpload ? [...uploads, lastUpload] : uploads,
                    );
                    setPendingCompletion(result.activityNumber);
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

    const handleConfirmComplete = () => {
        if (!pendingCompletion) return;

        const phqParam = phqResultId ? `&phqResultId=${phqResultId}` : "";

        if (pendingCompletion === 1) {
            router.push(
                `/students/${studentId}/help/start/assessment?activity=${pendingCompletion}${phqParam}`,
            );
        } else {
            router.push(
                `/students/${studentId}/help/start/encouragement?activity=${pendingCompletion}${phqParam}`,
            );
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

        // Completion confirmation
        pendingCompletion,
        completedUploads,
        handleConfirmComplete,

        // Handlers
        handleFileSelect,
        handleSaveNotes,
    };
}
