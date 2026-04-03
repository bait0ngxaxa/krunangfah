/**
 * Student Actions - Public API
 * Re-exports for clean module interface
 */

// Types
export type {
    StudentWithLatestPhq,
    StudentListResponse,
    RiskCountsResponse,
    GetStudentsOptions,
    StudentDashboardDataResponse,
    StudentDashboardQueryOptions,
    ImportResult,
    IncompleteActivityInfo,
} from "./types";

// Main functions (with authentication)
export {
    getStudents,
    getStudentsForDashboard,
    searchStudents,
    getStudentDetail,
    getStudentRiskCounts,
    hasRound1Data,
    getIncompleteActivityWarning,
} from "./main";

export { getStudentDashboardData } from "./dashboard";

// Mutations
export { importStudents } from "./mutations";
