import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InviteActionRow } from "@/components/ui/InviteActionRow";

describe("InviteActionRow permissions", () => {
    it("ไม่แสดงปุ่มยกเลิกเมื่อ capability ไม่อนุญาต", () => {
        const html = renderToStaticMarkup(
            <InviteActionRow
                isRevoking={false}
                onConfirmRevoke={vi.fn()}
                revokeDialogTitle="ยกเลิกคำเชิญ"
                revokeDialogMessage="ยืนยัน"
                showCopyButton={false}
                showRevokeButton={false}
            />,
        );

        expect(html).not.toContain("ยกเลิก");
        expect(html).not.toContain("<button");
    });
});
