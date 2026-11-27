import { type ParsedStudent } from "@/lib/utils/excel-parser";
import type { RiskLevel } from "@/lib/constants/risk-levels";
import type { IncompleteActivityInfo } from "@/lib/actions/student/types";
import type { ImportResult } from "@/lib/actions/student/types";
import type { ImportCompletionContext } from "../completion";

/**
 * Props for ImportPreview component
 */
export interface ImportPreviewProps {
    data: ParsedStudent[];
    parseErrors?: string[];
    onCancel: () => void;
    onSuccess: (
        result: ImportResult,
        context: ImportCompletionContext,
    ) => void;
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
    isImportContextLoaded: boolean;
    hasImportContextError: boolean;
    importContextQueryError: {
        requestId: string;
        message?: string;
    } | null;
    academicYears: AcademicYear[];
    selectedYearId: string;
    assessmentRound: number;
    teacherProfile: TeacherProfile | null;
    schoolClassNames: string[];
    hasRound1: boolean;
    isRound1Checking: boolean;
    round1CheckFailed: boolean;
    incompleteCheckFailed: boolean;
    incompleteWarning: IncompleteActivityInfo | null;
    zeroScoreWarning: ZeroScoreWarningInfo | null;
    /** Numeric-cell codes in the exact payload a save would submit */
    numericStudentIdCount: number;

    // Computed values
    previewData: PreviewStudent[];
    filteredOutStudents: PreviewStudent[];
    riskCounts: RiskCounts;

    // Actions
    handleYearChange: (yearId: string) => void;
    setAssessmentRound: (round: number) => void;
    handleRemoveStudent: (studentIndex: number) => void;
    handleDismissError: () => void;
    /** `acknowledgedNumericCount` is the numeric count the user confirmed in the dialog */
    handleSave: (acknowledgedNumericCount: number) => void;
}
