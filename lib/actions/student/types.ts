/**
 * Student Types
 * Type definitions for student-related operations
 */

// Student with latest PHQ result
export interface StudentWithLatestPhq {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    class: string;
    phqResults: {
        totalScore: number;
        riskLevel: string;
    }[];
}

// Paginated student list response
export interface StudentListResponse {
    students: StudentWithLatestPhq[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// Risk counts for Pie Chart
export interface RiskCountsResponse {
    red: number;
    orange: number;
    yellow: number;
    green: number;
    blue: number;
    total: number;
    classes: string[];
}

// Options for getStudents
export interface GetStudentsOptions {
    classFilter?: string;
    page?: number;
    limit?: number;
}

// Import result type
export interface ImportResult {
    success: boolean;
    message: string;
    imported?: number;
    skipped?: number;
    errors?: string[];
}

// Raw query result types
export interface RiskCountRaw {
    risk_level: string;
    count: bigint;
}
