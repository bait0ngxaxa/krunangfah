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
    error?: string;
    uploadedCount?: number;
    requiredCount?: number;
    completed?: boolean;
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
