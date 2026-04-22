/**
 * Type definitions for in-memory rate limiting
 */

/**
 * Configuration for a rate limiter instance
 */
export interface RateLimitConfig {
    /** Maximum number of requests allowed within the window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Human-readable identifier for this limiter (for logging) */
    name: string;
    /** Maximum number of distinct keys stored in memory at once */
    maxEntries?: number;
}

/**
 * Result returned after checking rate limit for a request
 */
export interface RateLimitResult {
    /** Whether the request is allowed */
    allowed: boolean;
    /** Maximum requests permitted in the window */
    limit: number;
    /** Number of remaining requests in the current window */
    remaining: number;
    /** Unix timestamp (seconds) when the window resets */
    resetAt: number;
    /** Seconds until the window resets (for Retry-After header) */
    retryAfterSeconds: number;
}

/**
 * Standardized rate-limit error payload returned to clients.
 */
export interface RateLimitErrorPayload {
    /** Stable error code for rate-limit violations */
    code: "RATE_LIMIT_EXCEEDED";
    /** Human-readable localized message */
    message: string;
    /** Seconds until client should retry */
    retryAfterSeconds: number;
    /** Unix timestamp (seconds) when current window resets */
    resetAt: number;
}

/**
 * Internal record of request timestamps for a single key (IP)
 */
export interface RateLimitEntry {
    /** Array of request timestamps (epoch ms) within the sliding window */
    timestamps: number[];
}

/**
 * Rate limiter instance returned by createRateLimiter
 */
export interface RateLimiter {
    /** Check if a request from the given key is allowed */
    check: (key: string) => RateLimitResult;
    /** Manually trigger cleanup of expired entries */
    cleanup: () => void;
    /** Stop the automatic cleanup interval */
    destroy: () => void;
}
