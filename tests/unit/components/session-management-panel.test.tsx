import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SessionManagementPanel } from "@/components/settings/SessionManagementPanel";

vi.mock("@/lib/actions/session-management.actions", () => ({
    listMySessions: vi.fn(),
    revokeOtherSessions: vi.fn(),
    revokeSessionById: vi.fn(),
}));

describe("SessionManagementPanel", () => {
    it("labels a stored client address as an IP address", () => {
        const html = renderToStaticMarkup(
            <SessionManagementPanel
                initialSessions={[
                    {
                        id: "session-1",
                        createdAt: new Date("2026-06-01T08:00:00.000Z"),
                        expiresAt: new Date("2026-06-02T08:00:00.000Z"),
                        lastActivityAt: new Date("2026-06-01T10:00:00.000Z"),
                        userAgentLabel: "Chrome บนคอมพิวเตอร์",
                        lastIpPrefix: "203.0.113.42",
                        isCurrent: true,
                    },
                ]}
            />,
        );

        expect(html).toContain("IP 203.0.113.42");
        expect(html).not.toContain("เครือข่าย 203.0.113.42");
    });
});
