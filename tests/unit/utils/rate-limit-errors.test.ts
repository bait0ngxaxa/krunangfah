import { describe, expect, it } from "vitest";
import {
    createRateLimitErrorPayload,
    createRateLimitMessage,
    encodeNextAuthRateLimitCode,
    getRateLimitMessageFromNextAuthCode,
    parseNextAuthRateLimitCode,
    pickRateLimitResult,
} from "@/lib/rate-limit-errors";
import type { RateLimitResult } from "@/types/rate-limit.types";

const baseResult: RateLimitResult = {
    allowed: false,
    limit: 5,
    remaining: 0,
    resetAt: 1_700_000_000,
    retryAfterSeconds: 90,
};

describe("rate-limit-errors", () => {
    it("creates standardized message with retry time", () => {
        expect(createRateLimitMessage(90)).toBe(
            "ส่งคำขอมากเกินไป กรุณารอ 2 นาที",
        );
    });

    it("creates standardized payload", () => {
        const payload = createRateLimitErrorPayload(baseResult);
        expect(payload.code).toBe("RATE_LIMIT_EXCEEDED");
        expect(payload.retryAfterSeconds).toBe(90);
        expect(payload.resetAt).toBe(1_700_000_000);
    });

    it("encodes and decodes nextauth rate-limit code", () => {
        const code = encodeNextAuthRateLimitCode(45);
        expect(code).toBe("rate_limited_45");
        expect(parseNextAuthRateLimitCode(code)).toBe(45);
    });

    it("returns null when nextauth code is not rate-limit code", () => {
        expect(parseNextAuthRateLimitCode("credentials")).toBeNull();
        expect(getRateLimitMessageFromNextAuthCode("credentials")).toBeNull();
    });

    it("picks the result with longest retry-after", () => {
        const shortResult: RateLimitResult = {
            ...baseResult,
            retryAfterSeconds: 30,
            resetAt: 1_700_000_030,
        };

        const longest = pickRateLimitResult([shortResult, baseResult]);
        expect(longest.retryAfterSeconds).toBe(90);
    });
});
