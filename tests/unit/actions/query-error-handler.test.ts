import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ logError: vi.fn() }));

vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));

const { handleQueryError } = await import("@/lib/actions/error-handler");

describe("handleQueryError", () => {
    it("logs the sanitized trace context and returns only a generic client error", () => {
        const backendError = new Error("P2024 SQL connection timeout");

        const result = handleQueryError<never>("Load protected query", backendError);

        expect(result.status).toBe("transient_error");
        if (result.status !== "transient_error") {
            throw new Error("Expected transient_error");
        }
        expect(result.requestId).toEqual(expect.any(String));
        expect(result.message).toBe(
            "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        );
        expect(result.message).not.toContain("P2024");
        expect(mocks.logError).toHaveBeenCalledWith(
            `Load protected query [requestId=${result.requestId}]`,
            backendError,
        );
    });
});
