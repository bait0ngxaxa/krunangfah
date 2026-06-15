import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
    attachRateLimitHeaders,
    createRateLimitApiResponse,
} from "@/lib/rate-limit-response";
import type { RateLimitResult } from "@/types/rate-limit.types";

function blockedResult(): RateLimitResult {
    return {
        allowed: false,
        limit: 5,
        remaining: 0,
        resetAt: 1_700_000_000,
        retryAfterSeconds: 30,
    };
}

describe("rate-limit-response", () => {
    it("creates a 429 response with retry and limit headers", async () => {
        const response = createRateLimitApiResponse(blockedResult());
        const body = await response.json();

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("30");
        expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
        expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
        expect(response.headers.get("X-RateLimit-Reset")).toBe("1700000000");
        expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("attaches rate-limit headers to an existing response", () => {
        const response = attachRateLimitHeaders(
            NextResponse.json({ ok: true }),
            {
                allowed: true,
                limit: 10,
                remaining: 7,
                resetAt: 1_700_000_100,
                retryAfterSeconds: 0,
            },
        );

        expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
        expect(response.headers.get("X-RateLimit-Remaining")).toBe("7");
        expect(response.headers.get("X-RateLimit-Reset")).toBe("1700000100");
    });
});
