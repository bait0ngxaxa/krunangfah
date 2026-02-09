/**
 * Server Actions for Authentication
 * Server-side functions for user registration (rate limited)
 */

"use server";

import { headers } from "next/headers";
import { createUser } from "@/lib/user";
import { createRateLimiter, extractClientIp } from "@/lib/rate-limit";
import { RATE_LIMIT_REGISTRATION } from "@/constants/rate-limit";
import type { SignUpCredentials, AuthResponse } from "@/types/auth.types";

// Module-level singleton: 3 registration attempts per hour per IP
const registrationLimiter = createRateLimiter(RATE_LIMIT_REGISTRATION);

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
        const timeMessage = minutes > 1
            ? `${minutes} นาที`
            : `${rateLimitResult.retryAfterSeconds} วินาที`;

        return {
            success: false,
            message: `ส่งคำขอมากเกินไป กรุณารอ ${timeMessage}`,
        };
    }

    return await createUser(credentials);
}
