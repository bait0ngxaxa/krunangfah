interface StudentPageStateInput {
    classFilter?: string;
    hasClassOptions: boolean;
    isAdmin: boolean;
    page?: string;
    referredFilter?: string;
    riskFilter?: string;
    totalStudents: number;
}

export function hasActiveStudentDashboardFilters(
    input: Pick<
        StudentPageStateInput,
        "classFilter" | "page" | "referredFilter" | "riskFilter"
    >,
): boolean {
    return Boolean(
        input.classFilter ||
            input.page ||
            input.referredFilter ||
            input.riskFilter,
    );
}

export function shouldShowStudentsImportEmptyState(
    input: StudentPageStateInput,
): boolean {
    if (input.isAdmin) {
        return false;
    }

    if (input.totalStudents > 0 || input.hasClassOptions) {
        return false;
    }

    return !hasActiveStudentDashboardFilters(input);
}
