interface StudentPageStateInput {
    classFilter?: string;
    hasClassOptions: boolean;
    isAdmin: boolean;
    page?: string;
    referredFilter?: string;
    riskFilter?: string;
    academicYearId?: string;
    assessmentRound?: number;
    totalStudents: number;
}

export function hasActiveStudentDashboardFilters(
    input: Pick<
        StudentPageStateInput,
        | "classFilter"
        | "page"
        | "referredFilter"
        | "riskFilter"
        | "academicYearId"
        | "assessmentRound"
    >,
): boolean {
    return Boolean(
        input.classFilter ||
            input.page ||
            input.referredFilter ||
            input.riskFilter ||
            input.academicYearId ||
            input.assessmentRound,
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
