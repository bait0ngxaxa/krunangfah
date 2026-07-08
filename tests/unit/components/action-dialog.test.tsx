import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionDialog } from "@/components/admin/data-management/ActionDialog";
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
