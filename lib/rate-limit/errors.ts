import type {
    RateLimitErrorPayload,
    RateLimitResult,
} from "@/types/rate-limit.types";

export const RATE_LIMIT_ERROR_CODE = "RATE_LIMIT_EXCEEDED" as const;
export const NEXTAUTH_RATE_LIMIT_CODE_PREFIX = "rate_limited";

export function formatRateLimitWaitTime(retryAfterSeconds: number): string {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return minutes > 1 ? `${minutes} นาที` : `${retryAfterSeconds} วินาที`;
}

export function createRateLimitMessage(
    retryAfterSeconds: number,
    prefix = "ส่งคำขอมากเกินไป กรุณารอ",
): string {
    return `${prefix} ${formatRateLimitWaitTime(retryAfterSeconds)}`;
}

export function createRateLimitErrorPayload(
    result: RateLimitResult,
): RateLimitErrorPayload {
    return {
        code: RATE_LIMIT_ERROR_CODE,
        message: createRateLimitMessage(result.retryAfterSeconds),
        retryAfterSeconds: result.retryAfterSeconds,
        resetAt: result.resetAt,
    };
}

export function pickRateLimitResult(results: RateLimitResult[]): RateLimitResult {
    const blocked = results.find((result) => !result.allowed) ?? results[0];

    return results.reduce((max, current) =>
        current.retryAfterSeconds > max.retryAfterSeconds ? current : max,
    blocked);
}

export function encodeNextAuthRateLimitCode(retryAfterSeconds: number): string {
    return `${NEXTAUTH_RATE_LIMIT_CODE_PREFIX}_${retryAfterSeconds}`;
}

export function parseNextAuthRateLimitCode(code?: string): number | null {
    if (!code || !code.startsWith(`${NEXTAUTH_RATE_LIMIT_CODE_PREFIX}_`)) {
        return null;
    }

    const retryAfterRaw = code.slice(NEXTAUTH_RATE_LIMIT_CODE_PREFIX.length + 1);
    const retryAfterSeconds = Number.parseInt(retryAfterRaw, 10);

    return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds
        : null;
}

export function getRateLimitMessageFromNextAuthCode(code?: string): string | null {
    const retryAfterSeconds = parseNextAuthRateLimitCode(code);
    if (retryAfterSeconds === null) {
        return null;
    }

    return createRateLimitMessage(retryAfterSeconds);
}
