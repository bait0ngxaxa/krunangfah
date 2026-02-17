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
import { createRateLimiter, extractClientIp } from "@/lib/rate-limit";
import { RATE_LIMIT_PASSWORD_CHANGE } from "@/lib/constants/rate-limit";
import { passwordChangeSchema } from "@/lib/validations/profile.validation";
import type {
    PasswordChangeInput,
    PasswordChangeResponse,
} from "@/types/profile.types";

// Rate limiter singleton: 3 attempts per hour per IP
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
        const ip = extractClientIp((name) => headerStore.get(name));

        const rateLimitResult = passwordChangeLimiter.check(ip);
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

        // Validate input
        const validated = passwordChangeSchema.parse(input);

        // Require authentication
        const session = await requireAuth();
        const userId = session.user.id;

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
        console.error("Change password error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        };
    }
}
