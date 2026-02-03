// components/student/activity/ActivityProgressTable/types.ts

import type { RiskLevel } from "@/lib/utils/phq-scoring";

/**
 * TypeScript interfaces for ActivityProgressTable components
 */

export interface WorksheetUpload {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date;
}

export interface Teacher {
    name: string | null;
    email: string;
    teacher: {
        firstName: string;
        lastName: string;
    } | null;
}

export interface ActivityProgress {
    id: string;
    studentId: string;
    phqResultId: string;
    activityNumber: number;
    status: string;
    worksheetUploads: WorksheetUpload[];
    scheduledDate: Date | null;
    teacher: Teacher | null;
}

export interface ActivityProgressTableProps {
    studentId: string;
    phqResultId: string;
    riskLevel: RiskLevel;
}

export interface TableHeaderProps {
    studentId: string;
    riskLevel: RiskLevel;
    completedCount: number;
    totalCount: number;
}

export interface DesktopTableProps {
    progressData: ActivityProgress[];
}

export interface MobileCardsProps {
    progressData: ActivityProgress[];
}

export interface ActivityRowProps {
    progress: ActivityProgress;
    index: number;
}

export interface ActivityCardProps {
    progress: ActivityProgress;
    index: number;
}

export interface ActivityStatusBadgeProps {
    status: string;
}

export interface ActivityIconProps {
    status: string;
    index: number;
    isLocked: boolean;
}
