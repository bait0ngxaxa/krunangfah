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
import { createRateLimiter, extractRateLimitKey } from "@/lib/rate-limit";
import {
    RATE_LIMIT_FORGOT_PASSWORD,
    RATE_LIMIT_PASSWORD_RESET_SUBMIT,
} from "@/lib/constants/rate-limit";
import {
    generatePasswordResetToken,
    hashPasswordResetToken,
} from "@/lib/token";
import { sendPasswordResetEmail } from "@/lib/email";
import { logError } from "@/lib/utils/logging";
import {
    forgotPasswordSchema,
    resetPasswordSchema,
} from "@/lib/validations/auth.validation";
import { createRateLimitErrorPayload } from "@/lib/rate-limit-errors";
import type { RateLimitErrorPayload } from "@/types/rate-limit.types";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";

interface ActionResult {
    success: boolean;
    message: string;
    error?: RateLimitErrorPayload;
}

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
    const rateLimitKey = extractRateLimitKey((name) => headerStore.get(name));
    const rateLimitResult = forgotPasswordRequestLimiter.check(rateLimitKey);

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
    const headerStore = await headers();
    const rateLimitKey = extractRateLimitKey((name) => headerStore.get(name));
    const rateLimitResult = passwordResetSubmitLimiter.check(rateLimitKey);
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

        await tx.user.update({
            where: { email: record.email },
            data: { password: hashedPassword },
        });

        return {
            success: true,
            message: "รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่",
        } satisfies ActionResult;
    });

    return result;
}
