import type {
    RateLimitConfig,
    RateLimitResult,
    RateLimitEntry,
    RateLimiter,
} from "@/types/rate-limit.types";
import {
    RATE_LIMIT_CLEANUP_INTERVAL_MS,
    RATE_LIMIT_MAX_ENTRIES,
} from "@/lib/constants/rate-limit";

export interface RateLimitHeaderOptions {
    readonly trustProxyHeaders?: boolean;
}

export const TRUSTED_PROXY_HEADERS: RateLimitHeaderOptions = {
    trustProxyHeaders: true,
};

function getFirstForwardedIp(forwarded: string): string {
    return forwarded.split(",")[0]?.trim() ?? "";
}

function isValidIpv4(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4) {
        return false;
    }

    return parts.every((part) => {
        if (!/^\d{1,3}$/.test(part)) {
            return false;
        }

        const value = Number(part);
        return value >= 0 && value <= 255;
    });
}

function isValidIp(ip: string): boolean {
    if (ip.length === 0 || ip.length > 45) {
        return false;
    }

    if (ip.includes(".")) {
        return isValidIpv4(ip);
    }

    return /^[\da-fA-F:]+$/.test(ip) && ip.includes(":");
}

/**
 * Creates an in-memory rate limiter with sliding window algorithm.
 *
 * @param config - Rate limit configuration (maxRequests, windowMs, name)
 * @returns RateLimiter instance with check, cleanup, and destroy methods
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
    const store = new Map<string, RateLimitEntry>();
    const maxEntries = config.maxEntries ?? RATE_LIMIT_MAX_ENTRIES;
    let redisLimiterPromise: Promise<RateLimiter> | null = null;
    let hasLoggedRedisFallback = false;

    function ensureCapacity(nextKey: string): void {
        if (store.has(nextKey) || store.size < maxEntries) {
            return;
        }

        const oldestKey = store.keys().next().value;
        if (typeof oldestKey === "string") {
            store.delete(oldestKey);
        }
    }

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
    async function checkMemory(key: string): Promise<RateLimitResult> {
        const now = Date.now();
        const windowStart = now - config.windowMs;

        const entry = store.get(key);
        const validTimestamps = entry
            ? entry.timestamps.filter((ts) => ts > windowStart)
            : [];

        // Denied: too many requests in the current window
        if (validTimestamps.length >= config.maxRequests) {
            ensureCapacity(key);
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
        ensureCapacity(key);
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
    async function destroyMemory(): Promise<void> {
        clearInterval(cleanupInterval);
    }

    async function getRedisLimiter(): Promise<RateLimiter> {
        if (redisLimiterPromise) {
            return redisLimiterPromise;
        }

        redisLimiterPromise = import("@/lib/rate-limit/redis").then(
            ({ createRedisRateLimiter }) => createRedisRateLimiter(config),
        );

        return redisLimiterPromise;
    }

    async function check(key: string): Promise<RateLimitResult> {
        if (process.env.RATE_LIMIT_DRIVER !== "redis") {
            return checkMemory(key);
        }

        try {
            const redisLimiter = await getRedisLimiter();
            return await redisLimiter.check(key);
        } catch (error) {
            if (!hasLoggedRedisFallback) {
                hasLoggedRedisFallback = true;
                console.error(
                    "Redis rate limiter unavailable; using memory fallback:",
                    error instanceof Error ? error.message : "Unknown error",
                );
            }

            return checkMemory(key);
        }
    }

    async function cleanupAsync(): Promise<void> {
        cleanup();
    }

    async function destroy(): Promise<void> {
        await destroyMemory();
        if (!redisLimiterPromise) {
            return;
        }

        const redisLimiter = await redisLimiterPromise;
        await redisLimiter.destroy();
    }

    return { check, cleanup: cleanupAsync, destroy };
}

/**
 * Extract client IP address from request headers.
 * Works in both middleware (NextRequest) and server actions (headers()).
 * Proxy IP headers are client-spoofable unless infrastructure strips and
 * rewrites them, so they are ignored by default.
 *
 * @param headerGetter - Function that returns a header value by name
 * @returns The client IP string, or "unknown" if not determinable
 */
export function extractClientIp(
    headerGetter: (name: string) => string | null,
    options: RateLimitHeaderOptions = {},
): string {
    if (!options.trustProxyHeaders) {
        return "unknown";
    }

    const realIp = headerGetter("x-real-ip");
    if (realIp) {
        const ip = realIp.trim();
        if (isValidIp(ip)) return ip;
    }

    const forwarded = headerGetter("x-forwarded-for");
    if (forwarded) {
        // x-forwarded-for may contain multiple IPs: client, proxy1, proxy2
        const ip = getFirstForwardedIp(forwarded);
        if (isValidIp(ip)) return ip;
    }

    return "unknown";
}

/**
 * Build stable rate-limit key from request headers.
 * Returns "unknown" when there is no trusted server-derived client identity.
 */
export function extractRateLimitKey(
    headerGetter: (name: string) => string | null,
    options: RateLimitHeaderOptions = {},
): string {
    const ip = extractClientIp(headerGetter, options);
    if (ip !== "unknown") {
        return ip;
    }

    return "unknown";
}
