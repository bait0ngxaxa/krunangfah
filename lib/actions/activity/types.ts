// Activity-related type definitions

export interface ActivityProgressData {
    id: string;
    studentId: string;
    phqResultId: string;
    activityNumber: number;
    status: string;
    worksheets: {
        id: string;
        worksheetNumber: number;
        filePath: string;
        uploadedAt: Date;
    }[];
    internalProblems: string | null;
    externalProblems: string | null;
    problemType: string | null;
    scheduledDate: Date | null;
    teacherId: string | null;
    teacherNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UploadWorksheetResult {
    success: boolean;
    message: string;
    worksheet?: {
        id: string;
        worksheetNumber: number;
        filePath: string;
    };
    error?:
        | "UPLOAD_UNAUTHORIZED"
        | "UPLOAD_FILE_MISSING"
        | "UPLOAD_FILE_TOO_LARGE"
        | "UPLOAD_INVALID_EXTENSION"
        | "UPLOAD_SIGNATURE_MISMATCH"
        | "UPLOAD_ACTIVITY_NOT_FOUND"
        | "UPLOAD_ACCESS_DENIED"
        | "UPLOAD_FILE_WRITE_FAILED"
        | "UPLOAD_DB_FAILED"
        | "UPLOAD_POST_PROCESS_FAILED"
        | "UPLOAD_UNKNOWN_ERROR";
    uploadedCount?: number;
    requiredCount?: number;
    allUploaded?: boolean;
    activityNumber?: number;
}

export interface SubmitAssessmentData {
    internalProblems: string;
    externalProblems: string;
    problemType: "internal" | "external";
}

export interface ScheduleActivityData {
    scheduledDate: Date;
    teacherId: string;
    teacherNotes?: string;
}
