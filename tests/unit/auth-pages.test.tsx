import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import SignInPage from "@/app/(auth)/signin/page";

const mocks = vi.hoisted(() => ({
    getServerSession: vi.fn(),
    redirect: vi.fn((path: string): never => {
        throw new Error(`NEXT_REDIRECT:${path}`);
    }),
}));

vi.mock("@/lib/auth/session", () => ({
    getServerSession: mocks.getServerSession,
}));

vi.mock("next/navigation", () => ({
    redirect: mocks.redirect,
}));

function createSession(): Session {
    return {
        expires: "2026-06-02T12:00:00.000Z",
        user: {
            id: "user-1",
            email: "teacher@example.com",
            name: "ครูทดสอบ",
            image: null,
            role: "school_admin",
            isPrimary: true,
            schoolId: "school-1",
        },
    };
}

describe("auth pages", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects signin to dashboard when the session is valid", async () => {
        mocks.getServerSession.mockResolvedValue(createSession());

        await expect(
            SignInPage({ searchParams: Promise.resolve({}) }),
        ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
        expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("allows signin when the session is missing or expired", async () => {
        mocks.getServerSession.mockResolvedValue(null);

        await expect(
            SignInPage({ searchParams: Promise.resolve({}) }),
        ).resolves.toBeTruthy();
        expect(mocks.redirect).not.toHaveBeenCalled();
    });

    it("redirects forgot password to dashboard when the session is valid", async () => {
        mocks.getServerSession.mockResolvedValue(createSession());

        await expect(ForgotPasswordPage()).rejects.toThrow(
            "NEXT_REDIRECT:/dashboard",
        );
        expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects reset password to dashboard when the session is valid", async () => {
        mocks.getServerSession.mockResolvedValue(createSession());

        await expect(
            ResetPasswordPage({
                searchParams: Promise.resolve({ token: "reset-token" }),
            }),
        ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
        expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    });
});
