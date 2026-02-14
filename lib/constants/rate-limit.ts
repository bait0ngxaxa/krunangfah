/**
 * Rate limit configuration constants
 */

import type { RateLimitConfig } from "@/types/rate-limit.types";

/**
 * Rate limit for login attempts (brute force protection)
 * 5 attempts per 15 minutes per IP
 */
export const RATE_LIMIT_AUTH_SIGNIN: RateLimitConfig = {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    name: "auth-signin",
};

/**
 * Rate limit for general auth API requests
 * 20 requests per minute per IP
 */
export const RATE_LIMIT_AUTH_GENERAL: RateLimitConfig = {
    maxRequests: 20,
    windowMs: 60 * 1000,
    name: "auth-general",
};

/**
 * Rate limit for user registration (server action)
 * 3 attempts per hour per IP
 */
export const RATE_LIMIT_REGISTRATION: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    name: "registration",
};

/**
 * Rate limit for forgot-password requests
 * 3 attempts per hour per IP
 */
export const RATE_LIMIT_FORGOT_PASSWORD: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    name: "forgot-password",
};

/** Interval for cleaning up expired rate limit entries (ms) */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 1000;
