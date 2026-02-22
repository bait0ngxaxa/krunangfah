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

export interface StudentDashboardProps {
    students: Student[];
    schools?: SchoolOption[];
    userRole?: string;
    referredOutStudents?: ReferredOutStudent[];
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

export type { RiskLevel };
