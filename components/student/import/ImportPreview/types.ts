import { type ParsedStudent } from "@/lib/utils/excel-parser";
import type { RiskLevel } from "@/lib/constants/risk-levels";
import type { IncompleteActivityInfo } from "@/lib/actions/student/types";
import type { ImportResult } from "@/lib/actions/student/types";

/**
 * Props for ImportPreview component
 */
export interface ImportPreviewProps {
    data: ParsedStudent[];
    parseErrors?: string[];
    onCancel: () => void;
    onSuccess: (result: ImportResult) => void;
    canViewNationalId: boolean;
}

/**
 * Extended student with calculated risk data
 */
export interface PreviewStudent extends ParsedStudent {
    totalScore: number;
    riskLevel: RiskLevel;
    /** Index in the editableData array — used for score edits after filtering */
    _originalIndex: number;
}

/**
 * Teacher profile information
 */
export interface TeacherProfile {
    role: string;
    advisoryClass: string | null;
}

/**
 * Academic year information
 */
export interface AcademicYear {
    id: string;
    year: number;
    semester: number;
    isCurrent?: boolean;
}

/**
 * Risk level counts
 */
export interface RiskCounts {
    blue: number;
    green: number;
    yellow: number;
    orange: number;
    red: number;
}

/**
 * Warning for students whose PHQ question scores are all zero.
 */
export interface ZeroScoreWarningInfo {
    studentCount: number;
    examples: Array<{
        studentId: string;
        fullName: string;
        class: string;
    }>;
}

/**
 * Return type for useImportPreview hook
 */
export interface UseImportPreviewReturn {
    // State
    isLoading: boolean;
    error: string | null;
    errorTitle: string;
    errorDescription: string;
    academicYears: AcademicYear[];
    selectedYearId: string;
    assessmentRound: number;
    teacherProfile: TeacherProfile | null;
    schoolClassNames: string[];
    hasRound1: boolean;
    incompleteWarning: IncompleteActivityInfo | null;
    zeroScoreWarning: ZeroScoreWarningInfo | null;

    // Computed values
    previewData: PreviewStudent[];
    filteredOutStudents: PreviewStudent[];
    riskCounts: RiskCounts;

    // Actions
    handleYearChange: (yearId: string) => void;
    setAssessmentRound: (round: number) => void;
    handleRemoveStudent: (studentIndex: number) => void;
    handleDismissError: () => void;
    handleSave: () => void;
}
