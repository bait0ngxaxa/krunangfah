import { createHash, randomBytes } from "crypto";

export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
const SESSION_TOKEN_BYTES = 32;

export function createSessionToken(): string {
    return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiry(now: Date): Date {
    return new Date(now.getTime() + SESSION_MAX_AGE_MS);
}
