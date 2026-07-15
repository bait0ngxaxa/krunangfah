import type {
    DataManagementEventItem,
    SchoolDataManagementPreview,
    SchoolSearchResult,
    StudentDataManagementPreview,
    StudentSearchResult,
} from "@/lib/actions/data-management/types";
import {
    getPermanentDeleteLifecycleMessage,
    isPermanentDeleteEligible as isLifecycleDeleteEligible,
} from "@/lib/actions/data-management/lifecycle-policy";

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
    | {
          id: string;
          reason: string;
          expectedUpdatedAt: Date;
          expectedImpactFingerprint: string;
      };

export function isPermanentDeleteEligible(
    preview: Pick<ManagedPreview, "type" | "disabledAt" | "isTestData">,
): boolean {
    return isLifecycleDeleteEligible(preview.type, preview);
}

export function getPermanentDeleteEligibilityMessage(
    preview: Pick<ManagedPreview, "type" | "disabledAt" | "isTestData">,
): string {
    const lifecycleMessage = getPermanentDeleteLifecycleMessage(
        preview.type,
        preview,
    );
    if (lifecycleMessage) return lifecycleMessage;
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
            expectedImpactFingerprint: preview.impactFingerprint,
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
