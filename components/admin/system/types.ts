import type {
    SystemEntityKind,
    SystemEntityResult,
    SystemSearchResult,
} from "@/lib/actions/system-admin/types";

export type SystemEntityFilter = "all" | SystemEntityKind;
export type SelectedSystemEntity = SystemEntityResult | null;

export const EMPTY_SYSTEM_RESULTS: SystemSearchResult = {
    schools: [],
    staffs: [],
    students: [],
};

export function flattenSystemResults(
    results: SystemSearchResult,
): SystemEntityResult[] {
    return [
        ...results.schools,
        ...results.staffs,
        ...results.students,
    ];
}
