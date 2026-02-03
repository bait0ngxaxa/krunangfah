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
    ImportResult,
} from "./types";

// Main functions (with authentication)
export {
    getStudents,
    searchStudents,
    getStudentDetail,
    getStudentRiskCounts,
} from "./main";

// Mutations
export { importStudents } from "./mutations";
