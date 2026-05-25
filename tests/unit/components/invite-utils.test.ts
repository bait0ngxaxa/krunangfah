import { describe, expect, it, vi } from "vitest";
import {
    buildInviteUrl,
    formatInviteDate,
    getInviteStatus,
    getInviteStatusLabel,
} from "@/components/ui/invite-utils";

describe("invite-utils", () => {
    it("returns completed status before checking expiration", () => {
        expect(
            getInviteStatus({
                completedAt: "2026-01-01T00:00:00.000Z",
                expiresAt: "2020-01-01T00:00:00.000Z",
                completedStatus: "accepted",
            }),
        ).toBe("accepted");

        expect(
            getInviteStatus({
                completedAt: "2026-01-01T00:00:00.000Z",
                expiresAt: "2020-01-01T00:00:00.000Z",
                completedStatus: "used",
            }),
        ).toBe("used");
    });

    it("returns expired or pending for incomplete invites", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-05-25T00:00:00.000Z"));

        expect(
            getInviteStatus({
                completedAt: null,
                expiresAt: "2026-05-24T23:59:59.000Z",
                completedStatus: "accepted",
            }),
        ).toBe("expired");

        expect(
            getInviteStatus({
                completedAt: null,
                expiresAt: "2026-05-26T00:00:00.000Z",
                completedStatus: "accepted",
            }),
        ).toBe("pending");

        vi.useRealTimers();
    });

    it("maps status labels to Thai display text", () => {
        expect(getInviteStatusLabel("pending")).toBe("รอดำเนินการ");
        expect(getInviteStatusLabel("accepted")).toBe("ใช้งานแล้ว");
        expect(getInviteStatusLabel("used")).toBe("ใช้งานแล้ว");
        expect(getInviteStatusLabel("expired")).toBe("หมดอายุ");
    });

    it("builds invite urls and formats Thai dates", () => {
        expect(buildInviteUrl("/invite/token-1")).toBe("/invite/token-1");
        expect(formatInviteDate("2026-05-25T00:00:00.000Z")).toContain("25");
    });
});
