/**
 * Rate limit configuration constants
 */

import type { RateLimitConfig } from "@/types/rate-limit.types";

/**
 * Rate limit for login attempts (brute force protection)
 * 8 attempts per 15 minutes per key
 */
export const RATE_LIMIT_AUTH_SIGNIN: RateLimitConfig = {
    maxRequests: 8,
    windowMs: 15 * 60 * 1000,
    name: "auth-signin",
};

/**
 * Rate limit for general auth API requests
 * 20 requests per minute per trusted request source
 */
export const RATE_LIMIT_AUTH_GENERAL: RateLimitConfig = {
    maxRequests: 20,
    windowMs: 60 * 1000,
    name: "auth-general",
};

/**
 * Broad flood guard for signin traffic from one network
 * 120 requests per minute per trusted request source
 */
export const RATE_LIMIT_AUTH_FLOOD: RateLimitConfig = {
    maxRequests: 120,
    windowMs: 60 * 1000,
    name: "auth-flood",
};

/**
 * Rate limit for forgot-password requests
 * 3 attempts per hour per trusted request source and email
 */
export const RATE_LIMIT_FORGOT_PASSWORD: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    name: "forgot-password",
};

/**
 * Rate limit for password reset submit (token + new password)
 * 10 attempts per hour per token
 */
export const RATE_LIMIT_PASSWORD_RESET_SUBMIT: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    name: "password-reset-submit",
};

/**
 * Rate limit for password change requests
 * 3 attempts per hour per user (stricter than signin for security)
 */
export const RATE_LIMIT_PASSWORD_CHANGE: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    name: "password-change",
};

/**
 * Broad flood guard before authenticated password-change rate limiting
 * 60 requests per hour per trusted request source
 */
export const RATE_LIMIT_PASSWORD_CHANGE_FLOOD: RateLimitConfig = {
    maxRequests: 60,
    windowMs: 60 * 60 * 1000,
    name: "password-change-flood",
};

/** Interval for cleaning up expired rate limit entries (ms) */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 1000;

/** Maximum number of distinct rate-limit keys kept in memory per limiter */
export const RATE_LIMIT_MAX_ENTRIES = 5000;
