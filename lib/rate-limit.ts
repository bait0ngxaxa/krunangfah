import type {
    RateLimitConfig,
    RateLimitResult,
    RateLimitEntry,
    RateLimiter,
} from "@/types/rate-limit.types";
import { RATE_LIMIT_CLEANUP_INTERVAL_MS } from "@/lib/constants/rate-limit";

/**
 * Creates an in-memory rate limiter with sliding window algorithm.
 *
 * @param config - Rate limit configuration (maxRequests, windowMs, name)
 * @returns RateLimiter instance with check, cleanup, and destroy methods
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
    const store = new Map<string, RateLimitEntry>();

    /**
     * Remove expired entries from the store
     */
    function cleanup(): void {
        const now = Date.now();
        const windowStart = now - config.windowMs;

        for (const [key, entry] of store.entries()) {
            const valid = entry.timestamps.filter((ts) => ts > windowStart);
            if (valid.length === 0) {
                store.delete(key);
            } else {
                store.set(key, { timestamps: valid });
            }
        }
    }

    // Auto-cleanup on interval
    const cleanupInterval = setInterval(
        cleanup,
        RATE_LIMIT_CLEANUP_INTERVAL_MS,
    );

    // Prevent interval from keeping the process alive in tests
    if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
        cleanupInterval.unref();
    }

    /**
     * Check if a request from the given key is allowed
     */
    function check(key: string): RateLimitResult {
        const now = Date.now();
        const windowStart = now - config.windowMs;

        const entry = store.get(key);
        const validTimestamps = entry
            ? entry.timestamps.filter((ts) => ts > windowStart)
            : [];

        // Denied: too many requests in the current window
        if (validTimestamps.length >= config.maxRequests) {
            const oldestInWindow = validTimestamps[0];
            const resetAtMs = oldestInWindow + config.windowMs;
            const resetAt = Math.ceil(resetAtMs / 1000);
            const retryAfterSeconds = Math.max(
                Math.ceil((resetAtMs - now) / 1000),
                1,
            );

            store.set(key, { timestamps: validTimestamps });

            return {
                allowed: false,
                limit: config.maxRequests,
                remaining: 0,
                resetAt,
                retryAfterSeconds,
            };
        }

        // Allowed: record this request timestamp
        validTimestamps.push(now);
        store.set(key, { timestamps: validTimestamps });

        return {
            allowed: true,
            limit: config.maxRequests,
            remaining: config.maxRequests - validTimestamps.length,
            resetAt: Math.ceil((now + config.windowMs) / 1000),
            retryAfterSeconds: 0,
        };
    }

    /**
     * Stop the automatic cleanup interval
     */
    function destroy(): void {
        clearInterval(cleanupInterval);
    }

    return { check, cleanup, destroy };
}

/**
 * Extract client IP address from request headers.
 * Works in both middleware (NextRequest) and server actions (headers()).
 *
 * @param headerGetter - Function that returns a header value by name
 * @returns The client IP string, or "unknown" if not determinable
 */
export function extractClientIp(
    headerGetter: (name: string) => string | null,
): string {
    // Basic IPv4/IPv6 format validation
    const isValidIp = (ip: string) =>
        /^[\d.:a-fA-F]+$/.test(ip) && ip.length <= 45;

    const forwarded = headerGetter("x-forwarded-for");
    if (forwarded) {
        // x-forwarded-for may contain multiple IPs: client, proxy1, proxy2
        const ip = forwarded.split(",")[0].trim();
        if (isValidIp(ip)) return ip;
    }

    const realIp = headerGetter("x-real-ip");
    if (realIp) {
        const ip = realIp.trim();
        if (isValidIp(ip)) return ip;
    }

    return "unknown";
}
