import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { type RiskLevel } from "@/lib/utils/phq-scoring";

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

    // Computed values
    previewData: PreviewStudent[];
    filteredOutStudents: PreviewStudent[];
    riskCounts: RiskCounts;

    // Actions
    setSelectedYearId: (id: string) => void;
    setAssessmentRound: (round: number) => void;
    handleSave: () => void;
}
