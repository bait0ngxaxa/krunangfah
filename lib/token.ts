/**
 * Password-reset token management
 *
 * Uses crypto.randomUUID() for secure, unpredictable tokens.
 * Each email may have at most ONE active token — older ones are deleted first.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/** Token lifetime: 1 hour */
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

interface TokenVerificationResult {
    valid: true;
    email: string;
    tokenId: string;
}

interface TokenVerificationError {
    valid: false;
    error: string;
}

type VerifyResult = TokenVerificationResult | TokenVerificationError;

/**
 * Generate a password-reset token for the given email.
 *
 * 1. Deletes any existing tokens for the email (one-token-per-email rule)
 * 2. Creates a new token with a 1-hour expiry
 *
 * @param email - The user's email address
 * @returns The generated token string
 */
export async function generatePasswordResetToken(
    email: string,
): Promise<string> {
    // Remove any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
        where: { email },
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await prisma.passwordResetToken.create({
        data: { email, token, expiresAt },
    });

    return token;
}

/**
 * Verify a password-reset token.
 *
 * @param token - The token string from the reset link
 * @returns Object with `valid: true` + email/tokenId, or `valid: false` + error message
 */
export async function verifyPasswordResetToken(
    token: string,
): Promise<VerifyResult> {
    const record = await prisma.passwordResetToken.findUnique({
        where: { token },
    });

    if (!record) {
        return { valid: false, error: "โทเค็นไม่ถูกต้องหรือถูกใช้ไปแล้ว" };
    }

    if (record.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.passwordResetToken.delete({ where: { id: record.id } });
        return { valid: false, error: "โทเค็นหมดอายุแล้ว กรุณาขอลิงก์ใหม่" };
    }

    return { valid: true, email: record.email, tokenId: record.id };
}
