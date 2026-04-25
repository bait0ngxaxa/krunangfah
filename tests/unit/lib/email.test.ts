import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mock factories — must run before any module is imported
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
    const send = vi.fn();
    return { send };
});

vi.mock("resend", () => {
    // Must be a class so `new Resend(apiKey)` works
    const Resend = vi.fn(function () {
        return { emails: { send: mocks.send } };
    });
    return { Resend };
});

// Fast-forward timers so backoff sleeps don't slow the suite
vi.useFakeTimers();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("lib/email", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();

        process.env = { ...originalEnv };
        delete process.env.RESEND_API_KEY;
        delete process.env.EMAIL_FROM;
        delete process.env.NEXT_PUBLIC_APP_URL;
    });

    // -----------------------------------------------------------------------
    // Configuration guard
    // -----------------------------------------------------------------------
    it("throws when RESEND_API_KEY is missing", async () => {
        const { sendPasswordResetEmail } = await import("@/lib/email");

        await expect(
            sendPasswordResetEmail("user@test.local", "token-1"),
        ).rejects.toThrow(/Missing RESEND_API_KEY/);

        expect(mocks.send).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------
    it("sends password-reset email on first attempt", async () => {
        process.env.RESEND_API_KEY = "re_test_key";
        process.env.EMAIL_FROM = "No Reply <no-reply@krucarejai.com>";
        process.env.NEXT_PUBLIC_APP_URL = "https://app.test.local";

        mocks.send.mockResolvedValue({ data: { id: "email-1" }, error: null });

        const { sendPasswordResetEmail } = await import("@/lib/email");

        await sendPasswordResetEmail("user@test.local", "token-123");

        expect(mocks.send).toHaveBeenCalledTimes(1);

        const payload = mocks.send.mock.calls[0][0] as {
            from: string;
            to: string;
            subject: string;
            html: string;
        };

        expect(payload.from).toBe("No Reply <no-reply@krucarejai.com>");
        expect(payload.to).toBe("user@test.local");
        expect(payload.subject).toBe("รีเซ็ตรหัสผ่าน — Krunangfah");
        expect(payload.html).toContain(
            "https://app.test.local/reset-password?token=token-123",
        );
    });

    // -----------------------------------------------------------------------
    // Non-retryable error (4xx validation)
    // -----------------------------------------------------------------------
    it("fails immediately on a non-retryable error without retrying", async () => {
        process.env.RESEND_API_KEY = "re_test_key";

        mocks.send.mockResolvedValue({
            data: null,
            error: { name: "validation_error", message: "invalid email" },
        });

        const { sendPasswordResetEmail } = await import("@/lib/email");

        await expect(
            sendPasswordResetEmail("bad-email", "token-fail"),
        ).rejects.toThrow(/Failed to send password-reset email/);

        // Must NOT retry on a 4xx validation error
        expect(mocks.send).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // Retryable error — succeeds on second attempt
    // -----------------------------------------------------------------------
    it("retries on rate_limit_exceeded and succeeds on second attempt", async () => {
        process.env.RESEND_API_KEY = "re_test_key";

        mocks.send
            .mockResolvedValueOnce({
                data: null,
                error: { name: "rate_limit_exceeded", message: "too many requests" },
            })
            .mockResolvedValueOnce({ data: { id: "email-ok" }, error: null });

        const { sendPasswordResetEmail } = await import("@/lib/email");

        // Run the call while advancing fake timers concurrently
        const promise = sendPasswordResetEmail("user@test.local", "tok");
        await vi.runAllTimersAsync();
        await promise;

        expect(mocks.send).toHaveBeenCalledTimes(2);
    });

    // -----------------------------------------------------------------------
    // Exhausted retries
    // -----------------------------------------------------------------------
    it("throws after MAX_RETRIES attempts on persistent retryable error", async () => {
        process.env.RESEND_API_KEY = "re_test_key";

        mocks.send.mockResolvedValue({
            data: null,
            error: { name: "internal_server_error", message: "server blew up" },
        });

        const { sendPasswordResetEmail } = await import("@/lib/email");

        // Attach rejection handler BEFORE running timers to avoid unhandled rejection
        const assertion = expect(
            sendPasswordResetEmail("user@test.local", "tok"),
        ).rejects.toThrow(/after 3 attempts/);

        await vi.runAllTimersAsync();
        await assertion;


        expect(mocks.send).toHaveBeenCalledTimes(3);
    });

    // -----------------------------------------------------------------------
    // Singleton
    // -----------------------------------------------------------------------
    it("reuses the singleton Resend client across multiple sends", async () => {
        const { Resend } = await import("resend");
        process.env.RESEND_API_KEY = "re_test_key";

        mocks.send.mockResolvedValue({ data: { id: "x" }, error: null });

        const { sendPasswordResetEmail } = await import("@/lib/email");

        await sendPasswordResetEmail("first@test.local", "a");
        await sendPasswordResetEmail("second@test.local", "b");

        // Resend constructor must only be called once (singleton)
        expect(Resend).toHaveBeenCalledTimes(1);
        expect(mocks.send).toHaveBeenCalledTimes(2);
    });
});
