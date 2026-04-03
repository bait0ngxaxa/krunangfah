import type { RiskLevel } from "@/lib/utils/phq-scoring";
import type { ReferredOutStudent } from "@/types/referral.types";

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
