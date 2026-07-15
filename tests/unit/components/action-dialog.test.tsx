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
    disabledAt: new Date("2026-07-14T00:00:00.000Z"),
    updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    disabledReason: null,
    isTestData: false,
    testDataReason: null,
    impact,
    recentEvents: [],
};

describe("ActionDialog", () => {
    it("allows disabled real data and gates test data from permanent delete", () => {
        const activeHtml = renderToStaticMarkup(
            <DataActionButtons
                preview={{ ...preview, disabledAt: null, isTestData: false }}
                onAction={vi.fn()}
            />,
        );
        const testDataHtml = renderToStaticMarkup(
            <DataActionButtons
                preview={{ ...preview, disabledAt: null, isTestData: true }}
                onAction={vi.fn()}
            />,
        );
        const testDataDisabledHtml = renderToStaticMarkup(
            <DataActionButtons
                preview={{ ...preview, isTestData: true }}
                onAction={vi.fn()}
            />,
        );
        const eligibleHtml = renderToStaticMarkup(
            <DataActionButtons
                preview={preview}
                onAction={vi.fn()}
            />,
        );
        const html =
            activeHtml + testDataHtml + testDataDisabledHtml + eligibleHtml;

        expect(html).toContain("ยกเลิกข้อมูลทดสอบ");
        expect(html).toContain("ปิดใช้งาน");
        expect(eligibleHtml).toContain("กู้คืน");
        expect(html).toContain("ลบถาวร");
        expect(activeHtml).toContain(">ปิดใช้งาน</button>");
        expect(testDataHtml).toContain(">ปิดใช้งาน</button>");
        const testDataDisableButton = testDataHtml
            .split("<button")
            .find((button) => button.includes(">ปิดใช้งาน</button>"));
        expect(testDataDisableButton).toContain('disabled=""');
        expect(activeHtml).toContain("ต้องปิดใช้งานข้อมูลก่อน");
        expect(testDataHtml).toContain(
            "ข้อมูลทดสอบไม่สามารถปิดใช้งานหรือลบถาวรได้",
        );
        expect(testDataDisabledHtml).toContain(">กู้คืน</button>");
        expect(testDataDisabledHtml).toContain(
            "ต้องยกเลิกการตั้งเป็นข้อมูลทดสอบก่อนลบถาวร",
        );
        expect(testDataDisabledHtml).toContain('disabled=""');
        const disabledProductionMarkButton = eligibleHtml
            .split("<button")
            .find((button) => button.includes(">ตั้งเป็นข้อมูลทดสอบ</button>"));
        expect(disabledProductionMarkButton).toContain('disabled=""');
        expect(eligibleHtml).toContain(
            "ข้อมูลถูกปิดใช้งานและไม่ใช่ข้อมูลทดสอบแล้ว สามารถตรวจผลกระทบและลบถาวรได้",
        );
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
        expect(html).toContain("ลบข้อมูลซ้ำหรือข้อมูลผิดที่ยืนยันแล้ว");
        expect(html).toContain("ไม่สามารถกู้คืนได้");
        expect(html).not.toContain("confirmation");
        expect(html).not.toContain("typedTargetName");
    });

    it("keeps the delete button disabled until a valid reason is entered", () => {
        const pendingAction: PendingDataManagementAction = {
            action: "permanent-delete",
            targetType: "school",
            targetId: preview.id,
            title: "ลบถาวร",
        };
        const shortReasonHtml = renderToStaticMarkup(
            <ActionDialog
                pendingAction={pendingAction}
                preview={preview}
                reason="ab"
                isPending={false}
                onReasonChange={vi.fn()}
                onCancel={vi.fn()}
                onConfirm={vi.fn()}
            />
        );
        const validReasonHtml = renderToStaticMarkup(
            <ActionDialog
                pendingAction={pendingAction}
                preview={preview}
                reason="ลบข้อมูลทดสอบ"
                isPending={false}
                onReasonChange={vi.fn()}
                onCancel={vi.fn()}
                onConfirm={vi.fn()}
            />
        );

        expect(shortReasonHtml).toContain('disabled=""');
        expect(validReasonHtml).not.toContain('disabled=""');
    });

    it("does not render a dialog bound to a different entity", () => {
        const html = renderToStaticMarkup(
            <ActionDialog
                pendingAction={{
                    action: "permanent-delete",
                    targetType: "school",
                    targetId: "cmoldtarget00000000000001",
                    title: "ลบถาวร",
                }}
                preview={preview}
                reason="ลบข้อมูลทดสอบ"
                isPending={false}
                onReasonChange={vi.fn()}
                onCancel={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );

        expect(html).toBe("");
    });
});
