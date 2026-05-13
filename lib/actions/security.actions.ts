/**
 * Server Actions for Security Settings
 * Password change with current password verification and rate limiting
 */

"use server";

import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { hashPassword } from "@/lib/user";
import { createRateLimiter, extractRateLimitKey } from "@/lib/rate-limit";
import {
    RATE_LIMIT_PASSWORD_CHANGE,
    RATE_LIMIT_PASSWORD_CHANGE_FLOOD,
} from "@/lib/constants/rate-limit";
import { createUserRateLimitKey } from "@/lib/rate-limit-keys";
import { passwordChangeSchema } from "@/lib/validations/profile.validation";
import { logError } from "@/lib/utils/logging";
import { createRateLimitErrorPayload } from "@/lib/rate-limit-errors";
import type {
    PasswordChangeInput,
    PasswordChangeResponse,
} from "@/types/profile.types";

// Broad IP/user-agent guard before authenticated per-user limiting.
const passwordChangeFloodLimiter = createRateLimiter(
    RATE_LIMIT_PASSWORD_CHANGE_FLOOD,
);
const passwordChangeLimiter = createRateLimiter(RATE_LIMIT_PASSWORD_CHANGE);

/**
 * Change user password
 *
 * Security measures:
 * - Rate limiting (3 attempts/hour) applied BEFORE password verification
 * - Verifies current password before allowing change
 * - Prevents reusing current password as new password
 * - Requires re-login after successful change (handled by client)
 *
 * @param input - Password change data (current, new, confirm)
 * @returns Response with success status and message
 */
export async function changePassword(
    input: PasswordChangeInput,
): Promise<PasswordChangeResponse> {
    try {
        // CRITICAL: Rate limit FIRST (before validation to prevent timing attacks)
        const headerStore = await headers();
        const rateLimitKey = extractRateLimitKey((name) =>
            headerStore.get(name),
        );

        const floodLimitResult =
            await passwordChangeFloodLimiter.check(rateLimitKey);
        if (!floodLimitResult.allowed) {
            const rateLimitError = createRateLimitErrorPayload(floodLimitResult);

            return {
                success: false,
                message: rateLimitError.message,
                error: rateLimitError,
            };
        }

        // Validate input
        const validated = passwordChangeSchema.parse(input);

        // Require authentication
        const session = await requireAuth();
        const userId = session.user.id;
        const userRateLimitResult = await passwordChangeLimiter.check(
            createUserRateLimitKey(userId),
        );
        if (!userRateLimitResult.allowed) {
            const rateLimitError =
                createRateLimitErrorPayload(userRateLimitResult);

            return {
                success: false,
                message: rateLimitError.message,
                error: rateLimitError,
            };
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });

        if (!user || !user.password) {
            return {
                success: false,
                message: "ไม่พบข้อมูลผู้ใช้",
            };
        }

        // Verify current password
        const isCurrentPasswordValid = await compare(
            validated.currentPassword,
            user.password,
        );

        if (!isCurrentPasswordValid) {
            return {
                success: false,
                message: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
            };
        }

        // Hash new password
        const hashedPassword = await hashPassword(validated.newPassword);

        // Update password in database
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return {
            success: true,
            message: "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่",
        };
    } catch (error) {
        logError(
            "Change password error:",
            error instanceof Error ? error.message : "Unknown error",
        );
        return {
            success: false,
            message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        };
    }
}
