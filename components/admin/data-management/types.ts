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

export type DataManagementActionRequest =
    | { id: string; reason: string }
    | { id: string; reason: string; expectedUpdatedAt: Date };

export function isPermanentDeleteEligible(
    preview: Pick<ManagedPreview, "disabledAt" | "isTestData">,
): boolean {
    return preview.disabledAt !== null && !preview.isTestData;
}

export function getPermanentDeleteEligibilityMessage(
    preview: Pick<ManagedPreview, "disabledAt" | "isTestData">,
): string {
    if (!preview.disabledAt) {
        return "ต้องปิดใช้งานข้อมูลก่อน จึงจะลบถาวรได้";
    }
    if (preview.isTestData) {
        return "ต้องยกเลิกการตั้งเป็นข้อมูลทดสอบก่อนลบถาวร";
    }
    return "ข้อมูลถูกปิดใช้งานและไม่ใช่ข้อมูลทดสอบแล้ว สามารถตรวจผลกระทบและลบถาวรได้";
}

export function createDataManagementActionInput(
    pendingAction: PendingDataManagementAction,
    preview: ManagedPreview,
    reason: string,
): DataManagementActionRequest {
    if (pendingAction.action === "permanent-delete") {
        return {
            id: pendingAction.targetId,
            reason,
            expectedUpdatedAt: preview.updatedAt,
        };
    }
    return { id: pendingAction.targetId, reason };
}

export function getManagedPreviewTitle(preview: ManagedPreview): string {
    return preview.type === "school"
        ? preview.name
        : preview.firstName + " " + preview.lastName;
}

export type { DataManagementEventItem };
