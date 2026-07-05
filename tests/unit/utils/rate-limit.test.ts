import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    createRateLimiter,
    extractClientIp,
    extractRateLimitKey,
} from "@/lib/rate-limit";

describe("createRateLimiter", () => {
    let limiter: ReturnType<typeof createRateLimiter>;

    afterEach(async () => {
        await limiter?.destroy();
    });

    describe("basic rate limiting", () => {
        beforeEach(() => {
            limiter = createRateLimiter({
                maxRequests: 3,
                windowMs: 60_000,
                name: "test-limiter",
            });
        });

        it("should allow requests within limit", async () => {
            const result = await limiter.check("user-1");
            expect(result.allowed).toBe(true);
            expect(result.limit).toBe(3);
            expect(result.remaining).toBe(2);
            expect(result.retryAfterSeconds).toBe(0);
        });

        it("should track remaining requests correctly", async () => {
            await limiter.check("user-1"); // remaining = 2
            const result2 = await limiter.check("user-1"); // remaining = 1
            expect(result2.allowed).toBe(true);
            expect(result2.remaining).toBe(1);

            const result3 = await limiter.check("user-1"); // remaining = 0
            expect(result3.allowed).toBe(true);
            expect(result3.remaining).toBe(0);
        });

        it("should deny requests exceeding limit", async () => {
            await limiter.check("user-1"); // 1
            await limiter.check("user-1"); // 2
            await limiter.check("user-1"); // 3

            const result = await limiter.check("user-1"); // 4 → denied
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.retryAfterSeconds).toBeGreaterThan(0);
        });

        it("should track each key independently", async () => {
            await limiter.check("user-1");
            await limiter.check("user-1");
            await limiter.check("user-1");

            // user-2 should still be allowed
            const result = await limiter.check("user-2");
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(2);
        });

        it("should return resetAt as Unix timestamp in seconds", async () => {
            const result = await limiter.check("user-1");
            expect(result.resetAt).toBeGreaterThan(0);
            // resetAt should be roughly now + windowMs in seconds
            const nowSec = Math.ceil(Date.now() / 1000);
            expect(result.resetAt).toBeGreaterThanOrEqual(nowSec);
            expect(result.resetAt).toBeLessThanOrEqual(nowSec + 61);
        });
    });

    describe("sliding window behavior", () => {
        it("should allow requests after window expires", async () => {
            vi.useFakeTimers();

            limiter = createRateLimiter({
                maxRequests: 2,
                windowMs: 1000,
                name: "test-window",
            });

            await limiter.check("user-1");
            await limiter.check("user-1");

            const blocked = await limiter.check("user-1");
            expect(blocked.allowed).toBe(false);

            // Advance time past the window
            vi.advanceTimersByTime(1001);

            const allowed = await limiter.check("user-1");
            expect(allowed.allowed).toBe(true);
            expect(allowed.remaining).toBe(1);

            vi.useRealTimers();
        });
    });

    describe("cleanup", () => {
        it("should remove expired entries on cleanup", async () => {
            vi.useFakeTimers();

            limiter = createRateLimiter({
                maxRequests: 5,
                windowMs: 1000,
                name: "test-cleanup",
            });

            await limiter.check("user-1");
            await limiter.check("user-2");

            // Advance time past the window
            vi.advanceTimersByTime(1500);

            await limiter.cleanup();

            // After cleanup, expired entries are removed, so user-1 can request again
            const result = await limiter.check("user-1");
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);

            vi.useRealTimers();
        });
    });

    describe("config with 1 max request", () => {
        it("should only allow 1 request", async () => {
            limiter = createRateLimiter({
                maxRequests: 1,
                windowMs: 60_000,
                name: "strict-limiter",
            });

            const first = await limiter.check("ip-1");
            expect(first.allowed).toBe(true);
            expect(first.remaining).toBe(0);

            const second = await limiter.check("ip-1");
            expect(second.allowed).toBe(false);
        });
    });

    describe("memory guard", () => {
        it("evicts the oldest key when maxEntries is exceeded", async () => {
            limiter = createRateLimiter({
                maxRequests: 1,
                windowMs: 60_000,
                name: "bounded-limiter",
                maxEntries: 2,
            });

            await limiter.check("ip-1");
            await limiter.check("ip-2");
            await limiter.check("ip-3");

            const result = await limiter.check("ip-1");
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(0);
        });
    });
});

describe("extractClientIp", () => {
    it("should ignore x-forwarded-for by default", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "1.2.3.4";
            return null;
        };

        expect(extractClientIp(getter)).toBe("unknown");
    });

    it("should extract IP from x-forwarded-for only for trusted proxy headers", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "1.2.3.4";
            return null;
        };

        expect(extractClientIp(getter, { trustProxyHeaders: true })).toBe(
            "1.2.3.4",
        );
    });

    it("should extract first trusted IP from comma-separated x-forwarded-for", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for")
                return "1.2.3.4, 10.0.0.1, 10.0.0.2";
            return null;
        };
        expect(extractClientIp(getter, { trustProxyHeaders: true })).toBe(
            "1.2.3.4",
        );
    });

    it("should trim whitespace from trusted x-forwarded-for IP", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "  1.2.3.4  , 10.0.0.1";
            return null;
        };
        expect(extractClientIp(getter, { trustProxyHeaders: true })).toBe(
            "1.2.3.4",
        );
    });

    it("should fall back to trusted x-real-ip header", () => {
        const getter = (name: string) => {
            if (name === "x-real-ip") return "5.6.7.8";
            return null;
        };
        expect(extractClientIp(getter, { trustProxyHeaders: true })).toBe(
            "5.6.7.8",
        );
    });

    it("should ignore invalid trusted x-forwarded-for and use x-real-ip", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "not an ip";
            if (name === "x-real-ip") return "5.6.7.8";
            return null;
        };

        expect(extractClientIp(getter, { trustProxyHeaders: true })).toBe(
            "5.6.7.8",
        );
    });

    it("should return unknown for invalid IP headers", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "not an ip";
            if (name === "x-real-ip") return "also invalid";
            return null;
        };

        expect(extractClientIp(getter, { trustProxyHeaders: true })).toBe(
            "unknown",
        );
    });

    it("should trim x-real-ip header", () => {
        const getter = (name: string) => {
            if (name === "x-real-ip") return "  5.6.7.8  ";
            return null;
        };
        expect(extractClientIp(getter, { trustProxyHeaders: true })).toBe(
            "5.6.7.8",
        );
    });

    it("should prefer trusted x-real-ip over x-forwarded-for", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "1.1.1.1";
            if (name === "x-real-ip") return "2.2.2.2";
            return null;
        };
        expect(extractClientIp(getter, { trustProxyHeaders: true })).toBe(
            "2.2.2.2",
        );
    });

    it("should return 'unknown' when no headers are present", () => {
        const getter = () => null;
        expect(extractClientIp(getter)).toBe("unknown");
    });
});

describe("extractRateLimitKey", () => {
    it("should not allow spoofed x-forwarded-for values to rotate rate-limit keys", async () => {
        const spoofedIps = ["1.2.3.4", "5.6.7.8"];
        const limiter = createRateLimiter({
            maxRequests: 1,
            windowMs: 60_000,
            name: "spoofed-forwarded-for",
        });

        try {
            const firstKey = extractRateLimitKey((name) => {
                if (name === "x-forwarded-for") return spoofedIps[0] ?? null;
                if (name === "user-agent") return "Mozilla/5.0 TestAgent";
                return null;
            });
            const secondKey = extractRateLimitKey((name) => {
                if (name === "x-forwarded-for") return spoofedIps[1] ?? null;
                if (name === "user-agent") return "Mozilla/5.0 TestAgent";
                return null;
            });

            const first = await limiter.check(firstKey);
            const second = await limiter.check(secondKey);

            expect(first.allowed).toBe(true);
            expect(second.allowed).toBe(false);
        } finally {
            await limiter.destroy();
        }
    });

    it("should use trusted x-real-ip when x-forwarded-for is spoofed", async () => {
        const limiter = createRateLimiter({
            maxRequests: 1,
            windowMs: 60_000,
            name: "trusted-real-ip",
        });

        try {
            const firstKey = extractRateLimitKey(
                (name) => {
                    if (name === "x-real-ip") return "203.0.113.10";
                    if (name === "x-forwarded-for") return "1.2.3.4";
                    return null;
                },
                { trustProxyHeaders: true },
            );
            const secondKey = extractRateLimitKey(
                (name) => {
                    if (name === "x-real-ip") return "203.0.113.10";
                    if (name === "x-forwarded-for") return "5.6.7.8";
                    return null;
                },
                { trustProxyHeaders: true },
            );

            const first = await limiter.check(firstKey);
            const second = await limiter.check(secondKey);

            expect(first.allowed).toBe(true);
            expect(second.allowed).toBe(false);
        } finally {
            await limiter.destroy();
        }
    });

    it("should not use spoofable x-forwarded-for by default", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "1.2.3.4";
            if (name === "user-agent") return "Mozilla/5.0";
            return null;
        };

        expect(extractRateLimitKey(getter)).toBe("unknown");
    });

    it("should use IP when proxy headers are explicitly trusted", () => {
        const getter = (name: string) => {
            if (name === "x-forwarded-for") return "1.2.3.4";
            if (name === "user-agent") return "Mozilla/5.0";
            return null;
        };

        expect(extractRateLimitKey(getter, { trustProxyHeaders: true })).toBe(
            "1.2.3.4",
        );
    });

    it("should not fall back to spoofable user-agent when IP is unknown", () => {
        const getter = (name: string) => {
            if (name === "user-agent") return "  Mozilla/5.0   TestAgent  ";
            return null;
        };

        expect(extractRateLimitKey(getter)).toBe("unknown");
    });

    it("should return unknown when both IP and user-agent are missing", () => {
        const getter = () => null;
        expect(extractRateLimitKey(getter)).toBe("unknown");
    });

    it("should return unknown when user-agent normalizes to empty", () => {
        const getter = (name: string) => {
            if (name === "user-agent") return "   ";
            return null;
        };

        expect(extractRateLimitKey(getter)).toBe("unknown");
    });
});
