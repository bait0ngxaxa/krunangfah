import type { Activity } from "./constants";

/**
 * Activity progress data from database
 */
export interface ActivityProgressData {
    id: string;
    activityNumber: number;
    status: string;
    teacherNotes?: string | null;
    worksheetUploads: {
        id: string;
        fileName: string;
        fileUrl: string;
    }[];
}

/**
 * Props for ActivityWorkspace component
 */
export interface ActivityWorkspaceProps {
    studentId: string;
    studentName: string;
    riskLevel: "orange" | "yellow" | "green";
    activityProgress: ActivityProgressData[];
    phqResultId?: string;
}

/**
 * Preview file state
 */
export interface PreviewFile {
    url: string;
    name: string;
}

/**
 * Return type for useActivityWorkspace hook
 */
export interface UseActivityWorkspaceReturn {
    // State
    uploading: string | null;
    previewFile: PreviewFile | null;
    setPreviewFile: (file: PreviewFile | null) => void;
    teacherNotes: string;
    setTeacherNotes: (notes: string) => void;
    savingNotes: boolean;

    // Computed values
    config: {
        gradient: string;
        bg: string;
        text: string;
        textColor: string;
        borderColor: string;
        glowBg: string;
        separatorColor: string;
    };
    activityNumbers: number[];
    activities: Activity[];
    currentProgress: ActivityProgressData | undefined;
    currentActivityNumber: number;
    currentActivity: Activity | undefined;

    // Handlers
    handleFileSelect: (progressId: string) => void;
    handleSaveNotes: () => Promise<void>;
}
