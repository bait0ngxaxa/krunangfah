import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { type RiskLevel, type PhqScores } from "@/lib/utils/phq-scoring";

/**
 * Props for ImportPreview component
 */
export interface ImportPreviewProps {
    data: ParsedStudent[];
    onCancel: () => void;
    onSuccess: () => void;
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
 * Return type for useImportPreview hook
 */
export interface UseImportPreviewReturn {
    // State
    isLoading: boolean;
    error: string | null;
    academicYears: AcademicYear[];
    selectedYearId: string;
    assessmentRound: number;
    teacherProfile: TeacherProfile | null;
    hasRound1: boolean;

    // Computed values
    previewData: PreviewStudent[];
    filteredOutStudents: PreviewStudent[];
    riskCounts: RiskCounts;

    // Actions
    handleYearChange: (yearId: string) => void;
    setAssessmentRound: (round: number) => void;
    handleScoreUpdate: (
        studentIndex: number,
        field: keyof PhqScores,
        value: number | boolean,
    ) => void;
    handleSave: () => void;
}
