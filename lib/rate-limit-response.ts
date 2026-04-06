import { CredentialsSignin } from "next-auth";
import { NextResponse } from "next/server";
import type { RateLimitResult } from "@/types/rate-limit.types";
import {
    createRateLimitErrorPayload,
    encodeNextAuthRateLimitCode,
} from "@/lib/rate-limit-errors";

export class RateLimitCredentialsSignin extends CredentialsSignin {
    constructor(result: RateLimitResult) {
        super();
        this.code = encodeNextAuthRateLimitCode(result.retryAfterSeconds);
    }
}

export function createRateLimitApiResponse(result: RateLimitResult): NextResponse {
    const error = createRateLimitErrorPayload(result);

    return NextResponse.json(
        { error },
        {
            status: 429,
            headers: {
                "Retry-After": result.retryAfterSeconds.toString(),
                "X-RateLimit-Limit": result.limit.toString(),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": result.resetAt.toString(),
            },
        },
    );
}

export function attachRateLimitHeaders(
    response: NextResponse,
    result: RateLimitResult,
): NextResponse {
    response.headers.set("X-RateLimit-Limit", result.limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.resetAt.toString());
    return response;
}
