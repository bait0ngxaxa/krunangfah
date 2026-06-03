import { afterEach, describe, expect, it, vi } from "vitest";
import { getSafeCallbackUrl } from "@/components/auth/SignInForm";

describe("getSafeCallbackUrl", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function stubWindowOrigin(origin: string): void {
        vi.stubGlobal("window", {
            location: { origin },
        });
    }

    it("allows internal callback paths", () => {
        stubWindowOrigin("http://localhost");

        expect(getSafeCallbackUrl("/students/1?tab=profile#top")).toBe(
            "/students/1?tab=profile#top",
        );
    });

    it("falls back to dashboard for external callback URLs", () => {
        stubWindowOrigin("http://localhost");

        expect(getSafeCallbackUrl("https://evil.example/login")).toBe(
            "/dashboard",
        );
    });

    it("falls back to dashboard for protocol-relative callback URLs", () => {
        stubWindowOrigin("http://localhost");

        expect(getSafeCallbackUrl("//evil.example/login")).toBe("/dashboard");
    });

    it("falls back to dashboard for missing callback URLs", () => {
        expect(getSafeCallbackUrl()).toBe("/dashboard");
    });
});
