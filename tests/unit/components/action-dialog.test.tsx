import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionDialog } from "@/components/admin/data-management/ActionDialog";
import { DataActionButtons } from "@/components/admin/system/SystemDataManagementSection";
vi.mock("@/lib/actions/data-management.actions", () => ({
    getDataManagementPreview: vi.fn(),
    runDataManagementAction: vi.fn(),
}));

import type {
    ManagedPreview,
    PendingDataManagementAction,
} from "@/components/admin/data-management/types";

const impact: ManagedPreview["impact"] = {
    userCount: 0,
    studentCount: 0,
    activeStudentCount: 0,
    phqResultCount: 0,
    activityProgressCount: 0,
    counselingSessionCount: 0,
    homeVisitCount: 0,
    worksheetUploadCount: 0,
    homeVisitPhotoCount: 0,
    pendingTeacherInviteCount: 0,
    pendingSchoolAdminInviteCount: 0,
    fileCount: 0,
};

const preview: ManagedPreview = {
    type: "school",
    id: "cmschool0000000000000001",
    name: "โรงเรียนทดสอบ",
    province: "เชียงใหม่",
    disabledAt: null,
    disabledReason: null,
    isTestData: true,
    testDataReason: null,
    impact,
    recentEvents: [],
};

describe("ActionDialog", () => {
    it("offers only test-data and permanent-delete actions in the system center", () => {
        const activeHtml = renderToStaticMarkup(
            <DataActionButtons preview={preview} onAction={vi.fn()} />,
        );
        const disabledHtml = renderToStaticMarkup(
            <DataActionButtons
                preview={{ ...preview, disabledAt: new Date() }}
                onAction={vi.fn()}
            />,
        );
        const html = `${activeHtml}${disabledHtml}`;

        expect(html).toContain("ยกเลิกข้อมูลทดสอบ");
        expect(html).toContain("ลบถาวร");
        expect(html).not.toContain("ปิดใช้งาน");
        expect(html).not.toContain("กู้คืน");
    });
    it("uses deletion-specific reason wording for permanent delete", () => {
        const pendingAction: PendingDataManagementAction = {
            action: "permanent-delete",
            targetType: "school",
            targetId: preview.id,
            title: "ลบถาวร",
        };

        const html = renderToStaticMarkup(
            <ActionDialog
                pendingAction={pendingAction}
                preview={preview}
                reason=""
                isPending={false}
                onReasonChange={vi.fn()}
                onCancel={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );

        expect(html).toContain("ใส่เหตุผล");
        expect(html).toContain("เหตุผลการลบถาวร");
        expect(html).toContain("ลบข้อมูลทดสอบที่สร้างเพื่อทดลองระบบ");
    });
});
