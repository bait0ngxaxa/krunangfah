import { headers } from "next/headers";
import { hashPassword } from "@/lib/auth/user";
import { hashToken } from "@/lib/auth/token";
import { RATE_LIMIT_INVITE_ACCEPT } from "@/lib/constants/rate-limit";
import {
    createRateLimiter,
    extractRateLimitKey,
    TRUSTED_PROXY_HEADERS,
} from "@/lib/rate-limit";
import { createRateLimitErrorPayload } from "@/lib/rate-limit/errors";
import { createTokenRateLimitKey } from "@/lib/rate-limit/keys";
import { inviteAcceptanceSchema } from "@/lib/validations/auth.validation";
import type { RateLimitErrorPayload } from "@/types/rate-limit.types";

export interface InviteAcceptanceResponse {
    success: boolean;
    message: string;
    error?: RateLimitErrorPayload;
}

export interface AcceptedInviteContext {
    tokenHash: string;
    hashedPassword: string;
}

interface InviteAcceptanceOptions<TResult extends InviteAcceptanceResponse> {
    token: unknown;
    password: unknown;
    checkToken: (
        tokenHash: string,
        now: Date,
    ) => Promise<InviteAcceptanceResponse | null>;
    accept: (context: AcceptedInviteContext) => Promise<TResult>;
}

const inviteAcceptLimiter = createRateLimiter(RATE_LIMIT_INVITE_ACCEPT);

async function checkAcceptanceRateLimit(
    rawToken: string,
): Promise<InviteAcceptanceResponse | null> {
    const headerStore = await headers();
    const requestKey = extractRateLimitKey(
        (name) => headerStore.get(name),
        TRUSTED_PROXY_HEADERS,
    );
    const key = `${requestKey}:${createTokenRateLimitKey(rawToken)}`;
    const result = await inviteAcceptLimiter.check(key);
    if (result.allowed) return null;

    const error = createRateLimitErrorPayload(result);
    return { success: false, message: error.message, error };
}

export async function acceptInvite<
    TResult extends InviteAcceptanceResponse,
>(
    options: InviteAcceptanceOptions<TResult>,
): Promise<InviteAcceptanceResponse | TResult> {
    const rawToken = typeof options.token === "string" ? options.token : "";
    const rateLimitFailure = await checkAcceptanceRateLimit(rawToken);
    if (rateLimitFailure) return rateLimitFailure;

    const parsed = inviteAcceptanceSchema.safeParse({
        token: options.token,
        password: options.password,
    });
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message };
    }

    const tokenHash = hashToken(parsed.data.token);
    const tokenFailure = await options.checkToken(tokenHash, new Date());
    if (tokenFailure) return tokenFailure;

    const hashedPassword = await hashPassword(parsed.data.password);
    return options.accept({ tokenHash, hashedPassword });
}
