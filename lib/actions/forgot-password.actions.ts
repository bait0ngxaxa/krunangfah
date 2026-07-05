/**
 * Server Actions for Forgot / Reset Password
 *
 * requestPasswordReset — rate-limited, sends reset email (never reveals if email exists)
 * resetPassword — verifies token, hashes new password, updates DB
 */

"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/database/prisma";
import { hashPassword } from "@/lib/auth/user";
import { invalidateUserSessionCaches } from "@/lib/auth/session-store";
import {
    createRateLimiter,
    extractRateLimitKey,
    TRUSTED_PROXY_HEADERS,
} from "@/lib/rate-limit";
import {
    createEmailRateLimitKey,
    createTokenRateLimitKey,
} from "@/lib/rate-limit/keys";
import {
    RATE_LIMIT_FORGOT_PASSWORD,
    RATE_LIMIT_PASSWORD_RESET_SUBMIT,
} from "@/lib/constants/rate-limit";
import {
    generatePasswordResetToken,
    hashPasswordResetToken,
} from "@/lib/auth/token";
import { sendPasswordResetEmail } from "@/lib/notifications/email";
import { logError } from "@/lib/utils/logging";
import {
    forgotPasswordSchema,
    resetPasswordSchema,
} from "@/lib/validations/auth.validation";
import { createRateLimitErrorPayload } from "@/lib/rate-limit/errors";
import type { RateLimitErrorPayload } from "@/types/rate-limit.types";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";

interface ActionResult {
    success: boolean;
    message: string;
    error?: RateLimitErrorPayload;
}

type ResetPasswordMutationResult = ActionResult & {
    userId?: string;
};

// Module-level singletons
const forgotPasswordRequestLimiter = createRateLimiter(
    RATE_LIMIT_FORGOT_PASSWORD,
);
const passwordResetSubmitLimiter = createRateLimiter(
    RATE_LIMIT_PASSWORD_RESET_SUBMIT,
);

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
    const rateLimitKey = extractRateLimitKey(
        (name) => headerStore.get(name),
        TRUSTED_PROXY_HEADERS,
    );
    const rawEmail = typeof input?.email === "string" ? input.email : "";
    const emailRateLimitKey = createEmailRateLimitKey(rateLimitKey, rawEmail);
    const rateLimitResult =
        await forgotPasswordRequestLimiter.check(emailRateLimitKey);

    if (!rateLimitResult.allowed) {
        const rateLimitError = createRateLimitErrorPayload(rateLimitResult);

        return {
            success: false,
            message: rateLimitError.message,
            error: rateLimitError,
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
            logError(
                "Failed to send password reset email:",
                error instanceof Error ? error.message : "Unknown error",
            );
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
    // --- Rate limit (ป้องกัน brute-force token) ---
    const rawToken = typeof input?.token === "string" ? input.token : "";
    const rateLimitKey = createTokenRateLimitKey(rawToken);
    const rateLimitResult =
        await passwordResetSubmitLimiter.check(rateLimitKey);
    if (!rateLimitResult.allowed) {
        const rateLimitError = createRateLimitErrorPayload(rateLimitResult);

        return {
            success: false,
            message: rateLimitError.message,
            error: rateLimitError,
        };
    }

    // --- Validate ---
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message };
    }

    const { token, password } = parsed.data;

    // --- Update password and delete token atomically ---
    const hashedPassword = await hashPassword(password);
    const tokenHash = hashPasswordResetToken(token);

    const result = await runSerializableTransaction(async (tx) => {
        const record = await tx.passwordResetToken.findUnique({
            where: { token: tokenHash },
            select: {
                id: true,
                email: true,
                expiresAt: true,
            },
        });

        if (!record) {
            return {
                success: false,
                message: "โทเค็นไม่ถูกต้องหรือถูกใช้ไปแล้ว",
            } satisfies ActionResult;
        }

        if (record.expiresAt < new Date()) {
            await tx.passwordResetToken.delete({
                where: { id: record.id },
            });

            return {
                success: false,
                message: "โทเค็นหมดอายุแล้ว กรุณาขอลิงก์ใหม่",
            } satisfies ActionResult;
        }

        const deleteResult = await tx.passwordResetToken.deleteMany({
            where: {
                id: record.id,
                token: tokenHash,
            },
        });

        if (deleteResult.count === 0) {
            return {
                success: false,
                message: "โทเค็นไม่ถูกต้องหรือถูกใช้ไปแล้ว",
            } satisfies ActionResult;
        }

        // Invalidate all sessions atomically with the password change:
        // a user resetting a forgotten password often does so because the
        // account was compromised — keep no stale sessions alive.
        const updatedUser = await tx.user.update({
            where: { email: record.email },
            data: { password: hashedPassword },
            select: { id: true },
        });

        await tx.userSession.updateMany({
            where: { userId: updatedUser.id, revokedAt: null },
            data: { revokedAt: new Date() },
        });

        return {
            success: true,
            message: "รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่",
            userId: updatedUser.id,
        } satisfies ResetPasswordMutationResult;
    });

    // Clear Redis session cache outside the transaction (best-effort).
    // The revocation above is already authoritative in the DB; this just
    // collapses the cache window so cached sessions are dropped immediately.
    if (result.success && result.userId) {
        await invalidateUserSessionCaches(result.userId).catch((error) =>
            logError("Reset password cache invalidation error:", error),
        );
    }

    return {
        success: result.success,
        message: result.message,
    };
}
