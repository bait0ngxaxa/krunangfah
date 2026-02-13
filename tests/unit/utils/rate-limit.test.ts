import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter, extractClientIp } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
    let limiter: ReturnType<typeof createRateLimiter>;

    afterEach(() => {
        limiter?.destroy();
    });

    describe("basic rate limiting", () => {
        beforeEach(() => {
            limiter = createRateLimiter({
                maxRequests: 3,
                windowMs: 60_000,
                name: "test-limiter",
            });
        });

        it("should allow requests within limit", () => {
            const result = limiter.check("user-1");
            expect(result.allowed).toBe(true);
            expect(result.limit).toBe(3);
            expect(result.remaining).toBe(2);
            expect(result.retryAfterSeconds).toBe(0);
        });

        it("should track remaining requests correctly", () => {
            limiter.check("user-1"); // remaining = 2
            const result2 = limiter.check("user-1"); // remaining = 1
            expect(result2.allowed).toBe(true);
            expect(result2.remaining).toBe(1);

            const result3 = limiter.check("user-1"); // remaining = 0
            expect(result3.allowed).toBe(true);
            expect(result3.remaining).toBe(0);
        });

        it("should deny requests exceeding limit", () => {
            limiter.check("user-1"); // 1
            limiter.check("user-1"); // 2
            limiter.check("user-1"); // 3

            const result = limiter.check("user-1"); // 4 → denied
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.retryAfterSeconds).toBeGreaterThan(0);
        });

        it("should track each key independently", () => {
            limiter.check("user-1");
            limiter.check("user-1");
            limiter.check("user-1");

            // user-2 should still be allowed
            const result = limiter.check("user-2");
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(2);
        });

        it("should return resetAt as Unix timestamp in seconds", () => {
            const result = limiter.check("user-1");
            expect(result.resetAt).toBeGreaterThan(0);
            // resetAt should be roughly now + windowMs in seconds
            const nowSec = Math.ceil(Date.now() / 1000);
            expect(result.resetAt).toBeGreaterThanOrEqual(nowSec);
            expect(result.resetAt).toBeLessThanOrEqual(nowSec + 61);
        });
    });

    describe("sliding window behavior", () => {
        it("should allow requests after window expires", () => {
            vi.useFakeTimers();

            limiter = createRateLimiter({
                maxRequests: 2,
                windowMs: 1000,
                name: "test-window",
            });

            limiter.check("user-1");
            limiter.check("user-1");

            const blocked = limiter.check("user-1");
            expect(blocked.allowed).toBe(false);

            // Advance time past the window
            vi.advanceTimersByTime(1001);

            const allowed = limiter.check("user-1");
            expect(allowed.allowed).toBe(true);
            expect(allowed.remaining).toBe(1);

            vi.useRealTimers();
        });
    });

    describe("cleanup", () => {
        it("should remove expired entries on cleanup", () => {
            vi.useFakeTimers();

            limiter = createRateLimiter({
                maxRequests: 5,
                windowMs: 1000,
                name: "test-cleanup",
            });

            limiter.check("user-1");
            limiter.check("user-2");

            // Advance time past the window
            vi.advanceTimersByTime(1500);

            limiter.cleanup();

            // After cleanup, expired entries are removed, so user-1 can request again
            const result = limiter.check("user-1");
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);

            vi.useRealTimers();
        });
    });

    describe("config with 1 max request", () => {
        it("should only allow 1 request", () => {
            limiter = createRateLimiter({
                maxRequests: 1,
                windowMs: 60_000,
                name: "strict-limiter",
            });

            const first = limiter.check("ip-1");
            expect(first.allowed).toBe(true);
            expect(first.remaining).toBe(0);

            const second = limiter.check("ip-1");
            expect(second.allowed).toBe(false);
        });
    });
});

describe("extractClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "1.2.3.4";
            return null;
        };
        expect(extractClientIp(getter)).toBe("1.2.3.4");
    });

    it("should extract first IP from comma-separated x-forwarded-for", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for")
                return "1.2.3.4, 10.0.0.1, 10.0.0.2";
            return null;
        };
        expect(extractClientIp(getter)).toBe("1.2.3.4");
    });

    it("should trim whitespace from x-forwarded-for IP", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "  1.2.3.4  , 10.0.0.1";
            return null;
        };
        expect(extractClientIp(getter)).toBe("1.2.3.4");
    });

    it("should fall back to x-real-ip header", () => {
        const getter = (name: string) => {
            if (name === "x-real-ip") return "5.6.7.8";
            return null;
        };
        expect(extractClientIp(getter)).toBe("5.6.7.8");
    });

    it("should trim x-real-ip header", () => {
        const getter = (name: string) => {
            if (name === "x-real-ip") return "  5.6.7.8  ";
            return null;
        };
        expect(extractClientIp(getter)).toBe("5.6.7.8");
    });

    it("should prefer x-forwarded-for over x-real-ip", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "1.1.1.1";
            if (name === "x-real-ip") return "2.2.2.2";
            return null;
        };
        expect(extractClientIp(getter)).toBe("1.1.1.1");
    });

    it("should return 'unknown' when no headers are present", () => {
        const getter = () => null;
        expect(extractClientIp(getter)).toBe("unknown");
    });
});
