import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";

const mocks = vi.hoisted(() => ({ logError: vi.fn() }));

vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));

const { handleActionError, handleQueryError } = await import(
    "@/lib/actions/error-handler"
);

beforeEach(() => {
    mocks.logError.mockClear();
});

function captureFrameworkError(action: () => never): unknown {
    try {
        action();
    } catch (error) {
        return error;
    }

    throw new Error("Expected Next.js control-flow helper to throw");
}

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

    it.each([
        ["redirect", () => redirect("/signin")],
        ["notFound", () => notFound()],
    ])("rethrows a Next.js %s control-flow error", (_name, action) => {
        const frameworkError = captureFrameworkError(action);

        expect(() =>
            handleQueryError<never>("Protected query", frameworkError),
        ).toThrow(frameworkError);
        expect(mocks.logError).not.toHaveBeenCalled();
    });
});

describe("handleActionError", () => {
    it("returns the configured fallback for a normal mutation error", () => {
        const mutationError = new Error("write failed");
        const fallback = { success: false, message: "บันทึกไม่สำเร็จ" };

        expect(
            handleActionError({
                context: "Mutation error",
                error: mutationError,
                fallback,
            }),
        ).toBe(fallback);
        expect(mocks.logError).toHaveBeenCalledWith(
            "Mutation error",
            mutationError,
        );
    });

    it.each([
        ["redirect", () => redirect("/signin")],
        ["notFound", () => notFound()],
    ])("rethrows a Next.js %s control-flow error", (_name, action) => {
        const frameworkError = captureFrameworkError(action);

        expect(() =>
            handleActionError({
                context: "Protected mutation",
                error: frameworkError,
                fallback: { success: false },
            }),
        ).toThrow(frameworkError);
        expect(mocks.logError).not.toHaveBeenCalled();
    });
});
