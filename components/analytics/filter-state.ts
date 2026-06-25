export type FilterKey = "school" | "class" | "year" | "semester" | "round";
export type FilterUpdates = Partial<Record<FilterKey, string | null>>;

export interface FilterState {
    school: string;
    class: string;
    year: string;
    semester: string;
    round: string;
}

export function buildFilterState(input: {
    selectedSchoolId: string;
    selectedClass: string;
    selectedAcademicYear: string;
    selectedSemester: string;
    selectedRound: string;
}): FilterState {
    return {
        school: input.selectedSchoolId,
        class: input.selectedClass,
        year: input.selectedAcademicYear,
        semester: input.selectedSemester,
        round: input.selectedRound,
    };
}

function getClearedFilterValue(
    key: FilterKey,
    isSystemAdmin: boolean,
): string {
    if (key === "school" && isSystemAdmin) {
        return "";
    }
    return "all";
}

function resolveFilterValue(
    key: FilterKey,
    value: string | null,
    isSystemAdmin: boolean,
): string {
    if (!value || value === "all") {
        return getClearedFilterValue(key, isSystemAdmin);
    }
    return value;
}

export function applyFilterUpdates(
    current: FilterState,
    updates: FilterUpdates,
    isSystemAdmin: boolean,
): FilterState {
    return {
        school:
            updates.school === undefined
                ? current.school
                : resolveFilterValue("school", updates.school, isSystemAdmin),
        class:
            updates.class === undefined
                ? current.class
                : resolveFilterValue("class", updates.class, isSystemAdmin),
        year:
            updates.year === undefined
                ? current.year
                : resolveFilterValue("year", updates.year, isSystemAdmin),
        semester:
            updates.semester === undefined
                ? current.semester
                : resolveFilterValue("semester", updates.semester, isSystemAdmin),
        round:
            updates.round === undefined
                ? current.round
                : resolveFilterValue("round", updates.round, isSystemAdmin),
    };
}

function setFilterParam(
    params: URLSearchParams,
    key: FilterKey,
    value: string,
): void {
    if (!value || value === "all") {
        params.delete(key);
        return;
    }
    params.set(key, value);
}

export function setFilterParams(
    params: URLSearchParams,
    filters: FilterState,
): void {
    setFilterParam(params, "school", filters.school);
    setFilterParam(params, "class", filters.class);
    setFilterParam(params, "year", filters.year);
    setFilterParam(params, "semester", filters.semester);
    setFilterParam(params, "round", filters.round);
}

export function buildFilterUrl(pathname: string, filters: FilterState): string {
    const params = new URLSearchParams();
    setFilterParams(params, filters);

    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
}

export function buildNamedSubmissionExportUrl(filters: FilterState): string {
    const params = new URLSearchParams();
    setFilterParams(params, filters);

    const queryString = params.toString();
    const pathname = "/api/v1/exports/named-submission";
    return queryString ? `${pathname}?${queryString}` : pathname;
}
