import type {
    DataManagementEventItem,
    SchoolDataManagementPreview,
    SchoolSearchResult,
    StudentDataManagementPreview,
    StudentSearchResult,
} from "@/lib/actions/data-management/types";

export type ManagedTarget = SchoolSearchResult | StudentSearchResult;
export type ManagedPreview =
    | SchoolDataManagementPreview
    | StudentDataManagementPreview;
export type ManagedTargetType = "school" | "student";
export type ManagedActionKey =
    | "mark-test"
    | "unmark-test"
    | "disable"
    | "restore"
    | "permanent-delete";

export interface PendingDataManagementAction {
    action: ManagedActionKey;
    targetType: ManagedTargetType;
    targetId: string;
    title: string;
}

export type { DataManagementEventItem };
