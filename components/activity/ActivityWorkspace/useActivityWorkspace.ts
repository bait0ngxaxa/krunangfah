import { useState, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    uploadWorksheet,
    updateTeacherNotes,
    deleteWorksheetUpload,
    confirmActivityComplete,
} from "@/lib/actions/activity";
import { compressImage } from "@/lib/utils/image-compression";
import {
    IMAGE_FILE_INPUT_ACCEPT,
    MAX_IMAGE_UPLOAD_INPUT_SIZE,
    MAX_IMAGE_UPLOAD_INPUT_SIZE_MB,
} from "@/lib/constants/image-upload";
import {
    ACTIVITIES,
    getWorksheetActivityIndices,
    getWorkspaceColorConfig,
} from "./constants";
import {
    UPLOAD_ACTION_TIMEOUT_MS,
    withTimeout,
} from "@/lib/utils/with-timeout";
import { retryUpload } from "@/lib/utils/upload-retry";
import type {
    ActivityWorkspaceProps,
    UseActivityWorkspaceReturn,
    PreviewFile,
} from "./types";
import {
    studentHelpAssessmentRoute,
    studentHelpEncouragementRoute,
} from "@/lib/constants/student-routes";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return "เกิดข้อผิดพลาดในการอัปโหลด";
}

interface PendingWorksheetUpload {
    progressId: string;
    file: File;
    requestId: string;
}

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
    const [pendingUpload, setPendingUpload] =
        useState<PendingWorksheetUpload | null>(null);
    const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
    const [teacherNotesDraft, setTeacherNotesDraft] = useState<{
        progressId: string | null;
        value: string;
    }>({
        progressId: null,
        value: "",
    });
    const [savingNotes, setSavingNotes] = useState(false);
    const [confirmingComplete, setConfirmingComplete] = useState(false);

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

    const currentProgressId = currentProgress?.id ?? null;
    const currentTeacherNotes = currentProgress?.teacherNotes ?? "";
    const teacherNotes =
        teacherNotesDraft.progressId === currentProgressId
            ? teacherNotesDraft.value
            : currentTeacherNotes;
    const setTeacherNotes = (next: SetStateAction<string>): void => {
        const resolvedValue =
            typeof next === "function" ? next(teacherNotes) : next;
        setTeacherNotesDraft({
            progressId: currentProgressId,
            value: resolvedValue,
        });
    };

    const handleUpload = async (
        progressId: string,
        file: File,
        requestId = crypto.randomUUID(),
    ): Promise<void> => {
        if (uploading) return;

        if (file.size > MAX_IMAGE_UPLOAD_INPUT_SIZE) {
            toast.error(
                `ไฟล์ต้นฉบับใหญ่เกินไป (สูงสุด ${MAX_IMAGE_UPLOAD_INPUT_SIZE_MB}MB)`,
            );
            return;
        }

        setUploading(progressId);
        try {
            const processedFile = await compressImage(file);

            const formData = new FormData();
            formData.append("file", processedFile);
            formData.append("uploadRequestId", requestId);

            const result = await retryUpload(
                () =>
                    withTimeout(
                        uploadWorksheet(progressId, formData),
                        UPLOAD_ACTION_TIMEOUT_MS,
                        "กำลังตรวจสอบสถานะการอัปโหลด",
                    ),
                ({ attempt, maxAttempts }) => {
                    toast.info(`กำลังลองอัปโหลดอีกครั้ง (${attempt}/${maxAttempts})`);
                },
            );

            if (result.success) {
                setPendingUpload(null);
                toast.success("อัปโหลดใบงานสำเร็จ");
                router.refresh();
            } else {
                setPendingUpload(
                    result.retryable ? { progressId, file, requestId } : null,
                );
                toast.error(result.message || "เกิดข้อผิดพลาดในการอัปโหลด");
            }
        } catch (error) {
            setPendingUpload({ progressId, file, requestId });
            toast.error(getErrorMessage(error));
        } finally {
            setUploading(null);
        }
    };

    const handleRetryUpload = async (): Promise<void> => {
        if (!pendingUpload || uploading) {
            return;
        }

        await handleUpload(
            pendingUpload.progressId,
            pendingUpload.file,
            pendingUpload.requestId,
        );
    };

    const handleConfirmComplete = async (): Promise<void> => {
        if (!currentProgress || confirmingComplete) return;

        setConfirmingComplete(true);
        try {
            const result = await confirmActivityComplete(currentProgress.id);
            if (result.success && result.activityNumber) {
                if (result.activityNumber === 1) {
                    router.push(
                        studentHelpAssessmentRoute(
                            studentId,
                            result.activityNumber,
                            phqResultId,
                        ),
                    );
                } else {
                    router.push(
                        studentHelpEncouragementRoute(
                            studentId,
                            result.activityNumber,
                            { phqResultId },
                        ),
                    );
                }
            } else {
                toast.error(result.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setConfirmingComplete(false);
        }
    };

    const handleFileSelect = (progressId: string): void => {
        if (uploading) return;

        const input = document.createElement("input");
        input.type = "file";
        input.accept = IMAGE_FILE_INPUT_ACCEPT;
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                setPendingUpload(null);
                handleUpload(progressId, file);
            }
        };
        input.click();
    };

    const handleDeleteUpload = async (uploadId: string): Promise<void> => {
        try {
            const result = await deleteWorksheetUpload(uploadId);
            if (result.success) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการลบไฟล์");
        }
    };

    const handleSaveNotes = async (): Promise<void> => {
        if (!currentProgress || savingNotes) return;

        setSavingNotes(true);
        try {
            const result = await updateTeacherNotes(
                currentProgress.id,
                teacherNotes,
            );

            if (result.success) {
                toast.success("บันทึกโน๊ตสำเร็จ");
                router.refresh();
            } else {
                toast.error(result.error || "เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSavingNotes(false);
        }
    };

    return {
        // State
        uploading,
        canRetryUpload: pendingUpload !== null,
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
        handleRetryUpload,
        handleDeleteUpload,
        handleConfirmComplete,
        handleSaveNotes,
    };
}
