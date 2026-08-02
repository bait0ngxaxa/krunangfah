import { createHash } from "crypto";
import { normalizeEmail } from "@/lib/utils/email";

function hashRateLimitPart(value: string): string {
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function createEmailRateLimitKey(
    requestKey: string,
    email: string,
): string {
    return `ip:${hashRateLimitPart(requestKey)}:email:${hashRateLimitPart(
        normalizeEmail(email),
    )}`;
}

export function createTokenRateLimitKey(token: string): string {
    return `token:${hashRateLimitPart(token)}`;
}

export function createUserRateLimitKey(userId: string): string {
    return `user:${hashRateLimitPart(userId)}`;
}
