import type { UserRole } from "@/types/auth.types";

export function canManageNamedSubmissionExport(
    userRole: UserRole,
    isPrimaryAdmin: boolean,
): boolean {
    return userRole === "system_admin" || (userRole === "school_admin" && isPrimaryAdmin);
}

export function canExportNamedSubmission(
    userRole: UserRole,
    isPrimaryAdmin: boolean,
    studentsWithAssessment: number,
): boolean {
    return (
        canManageNamedSubmissionExport(userRole, isPrimaryAdmin) &&
        studentsWithAssessment > 0
    );
}
