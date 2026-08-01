// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh }),
}));

describe("QueryErrorState", () => {
    it("shows a retry state without an import action", () => {
        const { container } = render(
            <QueryErrorState requestId="request-123" />,
        );
        const html = container.innerHTML;

        expect(html).toContain("โหลดข้อมูลไม่สำเร็จ");
        expect(html).toContain("request-123");
        expect(html).toContain("โหลดข้อมูลอีกครั้ง");
        expect(html).not.toContain("นำเข้าข้อมูล");

        fireEvent.click(
            screen.getByRole("button", { name: "โหลดข้อมูลอีกครั้ง" }),
        );
        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it("uses the scoped retry callback when one is provided", () => {
        const onRetry = vi.fn();
        render(
            <QueryErrorState requestId="request-456" onRetry={onRetry} />,
        );

        fireEvent.click(
            screen.getByRole("button", { name: "โหลดข้อมูลอีกครั้ง" }),
        );
        expect(onRetry).toHaveBeenCalledTimes(1);
    });
});
