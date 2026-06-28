/**
 * Password-reset token management
 *
 * Stores SHA-256 hash of tokens in DB (never plaintext).
 * Each email may have at most ONE active token — newer requests replace the old one.
 */

import crypto from "crypto";
import { prisma } from "@/lib/database/prisma";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";

/** Token lifetime: 1 hour */
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const INVITE_TOKEN_BYTES = 32;

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
 * One-way hash for bearer tokens before DB persistence.
 */
export function hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * One-way hash for password reset tokens before DB persistence.
 */
export function hashPasswordResetToken(token: string): string {
    return hashToken(token);
}

/**
 * Generate a high-entropy invite token. Only the hash is stored in the DB.
 */
export function generateInviteToken(): string {
    return crypto.randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
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

