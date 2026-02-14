/**
 * Server Actions for Forgot / Reset Password
 *
 * requestPasswordReset — rate-limited, sends reset email (never reveals if email exists)
 * resetPassword — verifies token, hashes new password, updates DB
 */

"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/user";
import { createRateLimiter, extractClientIp } from "@/lib/rate-limit";
import { RATE_LIMIT_FORGOT_PASSWORD } from "@/lib/constants/rate-limit";
import {
    generatePasswordResetToken,
    verifyPasswordResetToken,
} from "@/lib/token";
import { sendPasswordResetEmail } from "@/lib/email";
import {
    forgotPasswordSchema,
    resetPasswordSchema,
} from "@/lib/validations/auth.validation";

interface ActionResult {
    success: boolean;
    message: string;
}

// Module-level singleton: 3 requests per hour per IP
const forgotPasswordLimiter = createRateLimiter(RATE_LIMIT_FORGOT_PASSWORD);

/**
 * Request a password-reset email.
 *
 * Always returns a success-like message to prevent email enumeration.
 */
export async function requestPasswordReset(input: {
    email: string;
}): Promise<ActionResult> {
    // --- Rate limit ---
    const headerStore = await headers();
    const ip = extractClientIp((name) => headerStore.get(name));
    const rateLimitResult = forgotPasswordLimiter.check(ip);

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

    // --- Validate ---
    const parsed = forgotPasswordSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message };
    }

    const { email } = parsed.data;

    // --- Check user existence (silently) ---
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
        try {
            const token = await generatePasswordResetToken(email);
            await sendPasswordResetEmail(email, token);
        } catch (error) {
            console.error("Failed to send password reset email:", error);
            // Don't expose the error to the client
        }
    }

    // Always return success to prevent email enumeration
    return {
        success: true,
        message:
            "หากอีเมลนี้มีอยู่ในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่านทางอีเมล",
    };
}

/**
 * Reset the user's password using a valid token.
 */
export async function resetPassword(input: {
    token: string;
    password: string;
    confirmPassword: string;
}): Promise<ActionResult> {
    // --- Validate ---
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message };
    }

    const { token, password } = parsed.data;

    // --- Verify token ---
    const verification = await verifyPasswordResetToken(token);
    if (!verification.valid) {
        return { success: false, message: verification.error };
    }

    // --- Update password ---
    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
        where: { email: verification.email },
        data: { password: hashedPassword },
    });

    // --- Delete used token ---
    await prisma.passwordResetToken.delete({
        where: { id: verification.tokenId },
    });

    return {
        success: true,
        message: "รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่",
    };
}
