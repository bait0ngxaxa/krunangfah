"use server";

import { headers } from "next/headers";
import { createRateLimiter, extractClientIp } from "@/lib/rate-limit";
import { RATE_LIMIT_AUTH_SIGNIN } from "@/lib/constants/rate-limit";

// Module-level singletons
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
