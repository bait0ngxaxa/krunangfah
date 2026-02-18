"use server";

import { headers } from "next/headers";
import { createUser } from "@/lib/user";
import { createRateLimiter, extractClientIp } from "@/lib/rate-limit";
import {
    RATE_LIMIT_REGISTRATION,
    RATE_LIMIT_AUTH_SIGNIN,
} from "@/lib/constants/rate-limit";
import { signUpSchema } from "@/lib/validations/auth.validation";
import type { SignUpCredentials, AuthResponse } from "@/types/auth.types";

// Module-level singletons
const registrationLimiter = createRateLimiter(RATE_LIMIT_REGISTRATION); // 3 attempts per hour per IP
const signinLimiter = createRateLimiter(RATE_LIMIT_AUTH_SIGNIN); // 5 attempts per 15 minutes per IP

export interface SignInRateLimitResult {
    allowed: boolean;
    message?: string;
}

/**
 * Check if signin attempt is allowed (rate limit check)
 * @returns Rate limit result with allowed flag and optional message
 */
export async function checkSignInRateLimit(): Promise<SignInRateLimitResult> {
    const headerStore = await headers();
    const ip = extractClientIp((name) => headerStore.get(name));

    const rateLimitResult = signinLimiter.check(ip);

    if (!rateLimitResult.allowed) {
        const minutes = Math.ceil(rateLimitResult.retryAfterSeconds / 60);
        const timeMessage =
            minutes > 1
                ? `${minutes} นาที`
                : `${rateLimitResult.retryAfterSeconds} วินาที`;

        return {
            allowed: false,
            message: `ส่งคำขอเข้าสู่ระบบมากเกินไป กรุณารอ ${timeMessage} แล้วลองใหม่อีกครั้ง`,
        };
    }

    return { allowed: true };
}

/**
 * Register a new user (rate limited: 3 attempts per hour per IP)
 * @param credentials - User registration credentials
 * @returns Authentication response
 */
export async function registerUser(
    credentials: SignUpCredentials,
): Promise<AuthResponse> {
    const headerStore = await headers();
    const ip = extractClientIp((name) => headerStore.get(name));

    const rateLimitResult = registrationLimiter.check(ip);

    if (!rateLimitResult.allowed) {
        const minutes = Math.ceil(rateLimitResult.retryAfterSeconds / 60);
        const timeMessage =
            minutes > 1
                ? `${minutes} นาที`
                : `${rateLimitResult.retryAfterSeconds} วินาที`;

        return {
            success: false,
            message: `ส่งคำขอมากเกินไป กรุณารอ ${timeMessage}`,
        };
    }

    // Validate input server-side (ป้องกัน bypass client-side validation)
    const parsed = signUpSchema.safeParse(credentials);
    if (!parsed.success) {
        return {
            success: false,
            message: parsed.error.issues[0].message,
        };
    }

    return await createUser(parsed.data);
}
