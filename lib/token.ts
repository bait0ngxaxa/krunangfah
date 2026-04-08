/**
 * Password-reset token management
 *
 * Stores SHA-256 hash of tokens in DB (never plaintext).
 * Each email may have at most ONE active token — newer requests replace the old one.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";

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
 * One-way hash for password reset tokens before DB persistence.
 */
export function hashPasswordResetToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a password-reset token for the given email.
 *
 * 1. Replaces any existing token for the email atomically
 * 2. Stores a new token hash with a 1-hour expiry
 *
 * @param email - The user's email address
 * @returns The generated plaintext token string (send via email only)
 */
export async function generatePasswordResetToken(
    email: string,
): Promise<string> {
    return runSerializableTransaction(async (tx) => {
        const token = crypto.randomUUID();
        const tokenHash = hashPasswordResetToken(token);
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

        await tx.passwordResetToken.upsert({
            where: { email },
            update: {
                token: tokenHash,
                expiresAt,
            },
            create: {
                email,
                token: tokenHash,
                expiresAt,
            },
        });

        return token;
    });
}

/**
 * Verify a password-reset token.
 *
 * @param token - The plaintext token string from the reset link
 * @returns Object with `valid: true` + email/tokenId, or `valid: false` + error message
 */
export async function verifyPasswordResetToken(
    token: string,
): Promise<VerifyResult> {
    const tokenHash = hashPasswordResetToken(token);

    const record = await prisma.passwordResetToken.findUnique({
        where: { token: tokenHash },
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

