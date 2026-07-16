import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

describe("QueryErrorState", () => {
    it("shows a retry state without an import action", () => {
        const html = renderToStaticMarkup(
            <QueryErrorState requestId="request-123" />,
        );

        expect(html).toContain("โหลดข้อมูลไม่สำเร็จ");
        expect(html).toContain("request-123");
        expect(html).toContain("โหลดข้อมูลอีกครั้ง");
        expect(html).not.toContain("นำเข้าข้อมูล");
    });
});
