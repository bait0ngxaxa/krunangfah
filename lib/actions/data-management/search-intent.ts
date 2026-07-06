export const MIN_DATA_MANAGEMENT_QUERY_LENGTH = 2;

export type DataManagementDataState = "all" | "active" | "disabled" | "test";

export interface DataManagementSearchIntentInput {
    query?: string;
    dataState?: DataManagementDataState;
    schoolId?: string;
    province?: string;
}

export function hasDataManagementSearchIntent(
    input: DataManagementSearchIntentInput,
): boolean {
    const query = input.query?.trim() ?? "";
    if (query.length >= MIN_DATA_MANAGEMENT_QUERY_LENGTH) return true;
    if (input.dataState === "disabled" || input.dataState === "test") return true;
    if (input.schoolId?.trim()) return true;
    return Boolean(input.province?.trim());
}
