import type { RiskLevel } from "@/lib/constants/risk-levels";
import type { ReferredOutStudent } from "@/types/referral.types";
import type {
    AvailableStudentTerm,
    StudentResultTerm,
} from "@/lib/actions/student/types";

export type { AvailableStudentTerm, StudentResultTerm };

export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    studentId?: string | null;
    class: string;
    schoolId?: string;
    phqResults: {
        totalScore: number;
        riskLevel: string;
        assessmentRound?: number;
        academicYear?: StudentResultTerm;
    }[];
    referral?: {
        id: string;
        fromTeacherUserId: string;
        toTeacherUserId: string;
    } | null;
}

export interface SchoolOption {
    id: string;
    name: string;
}

export interface ClassOption {
    name: string;
    count: number;
}

export type DashboardRiskFilter = RiskLevel | "all";

export interface StudentDashboardFilters {
    schoolId?: string;
    className?: string;
    page?: string;
    riskLevel?: string;
    referredOnly?: string;
    academicYearId?: string;
    assessmentRound?: number;
    unscreened?: string;
}

export interface StudentDashboardProps {
    students: Student[];
    classes: string[];
    classOptions: ClassOption[];
    riskCounts: StudentGroupCounts;
    referredCount: number;
    totalStudents: number;
    filteredStudentCount: number;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    schools?: SchoolOption[];
    userRole?: string;
    referredOutStudents?: ReferredOutStudent[];
    filters?: StudentDashboardFilters;
    currentAcademicYearId?: string | null;
    availableTerms?: AvailableStudentTerm[];
    selectedTerm?: StudentResultTerm | null;
    currentAcademicYear?: number | null;
    unscreenedThisYearCount?: number;
    unscreenedFilterApplied?: boolean;
}

/** The "no result this academic year" chip; absent when it must not show. */
export interface UnscreenedChip {
    academicYear: number;
    count: number;
    active: boolean;
}

export interface PieChartDataItem {
    name: string;
    value: number;
    color: string;
}

export interface GroupedStudents {
    red: Student[];
    orange: Student[];
    yellow: Student[];
    green: Student[];
    blue: Student[];
}

export interface StudentGroupCounts {
    red: number;
    orange: number;
    yellow: number;
    green: number;
    blue: number;
}

export type { RiskLevel };
