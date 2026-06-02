import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "@/proxy";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-store";

function createRequest(path: string, token?: string): NextRequest {
    const request = new NextRequest(`http://localhost${path}`);

    if (token) {
        request.cookies.set(SESSION_COOKIE_NAME, token);
    }

    return request;
}

describe("proxy route protection", () => {
    it("allows signin when an expired session cookie is still present", async () => {
        const response = await proxy(createRequest("/signin", "expired-token"));

        expect(response.headers.get("location")).toBeNull();
    });

    it("redirects protected routes without a session cookie to signin", async () => {
        const response = await proxy(createRequest("/dashboard"));

        expect(response.headers.get("location")).toBe("http://localhost/signin");
    });
});
