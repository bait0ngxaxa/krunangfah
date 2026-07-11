import { compare } from "bcryptjs";
import { prisma } from "@/lib/database/prisma";
import {
    createRateLimiter,
    extractRateLimitKey,
    TRUSTED_PROXY_HEADERS,
} from "@/lib/rate-limit";
import {
    RATE_LIMIT_AUTH_FLOOD,
    RATE_LIMIT_AUTH_SIGNIN,
} from "@/lib/constants/rate-limit";
import {
    createRateLimitMessage,
    encodeNextAuthRateLimitCode,
    pickRateLimitResult,
} from "@/lib/rate-limit/errors";
import { createEmailRateLimitKey } from "@/lib/rate-limit/keys";
import { signInSchema } from "@/lib/validations/auth.validation";
import {
    getUserSessionVersion,
    setCachedSession,
} from "@/lib/auth/session-cache";
import { isSchoolAccessDisabled } from "./session-policy";
import {
    createSessionPayload,
    SESSION_USER_INCLUDE,
} from "./session-record";
import { getSessionMetadata, type HeaderGetter } from "./session-metadata";
import {
    createSessionToken,
    getSessionExpiry,
    hashSessionToken,
} from "./session-token";
import { syncSystemAdminRole } from "./system-admin-role";

interface SignInSuccess {
    success: true;
    token: string;
    redirectTo: string;
}

interface SignInFailure {
    success: false;
    message: string;
    code?: string;
}

export type StatefulSignInResult = SignInSuccess | SignInFailure;

const signinAttemptLimiter = createRateLimiter(RATE_LIMIT_AUTH_SIGNIN);
const signinFloodLimiter = createRateLimiter(RATE_LIMIT_AUTH_FLOOD);

async function checkSigninRateLimit(
    email: string,
    headerGetter: HeaderGetter,
): Promise<SignInFailure | null> {
    const rateLimitKey = extractRateLimitKey(headerGetter, TRUSTED_PROXY_HEADERS);
    const credentialKey = createEmailRateLimitKey(rateLimitKey, email);
    const [credentialLimit, floodLimit] = await Promise.all([
        signinAttemptLimiter.check(credentialKey),
        signinFloodLimiter.check(rateLimitKey),
    ]);

    if (credentialLimit.allowed && floodLimit.allowed) {
        return null;
    }

    const result = pickRateLimitResult([credentialLimit, floodLimit]);
    return {
        success: false,
        message: createRateLimitMessage(result.retryAfterSeconds),
        code: encodeNextAuthRateLimitCode(result.retryAfterSeconds),
    };
}

async function createUserSession(
    userId: string,
    headerGetter: HeaderGetter,
): Promise<string> {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const now = new Date();
    const session = await prisma.userSession.create({
        data: {
            sessionTokenHash: tokenHash,
            userId,
            expiresAt: getSessionExpiry(now),
            lastActivityAt: now,
            tokenRotatedAt: now,
            ...getSessionMetadata(headerGetter),
        },
        include: SESSION_USER_INCLUDE,
    });

    const sessionVersion = await getUserSessionVersion(userId);
    await setCachedSession(
        tokenHash,
        createSessionPayload(session, now, sessionVersion),
    );
    return token;
}

export async function signInWithPassword(
    input: unknown,
    headerGetter: HeaderGetter,
): Promise<StatefulSignInResult> {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, message: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" };
    }

    const { email, password } = parsed.data;
    const rateLimitFailure = await checkSigninRateLimit(email, headerGetter);
    if (rateLimitFailure) return rateLimitFailure;

    const user = await prisma.user.findUnique({
        where: { email },
        include: { school: { select: { disabledAt: true } } },
    });
    if (!user || user.deletedAt || !user.password) {
        return { success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }
    if (isSchoolAccessDisabled(user)) {
        return {
            success: false,
            message: "โรงเรียนนี้ถูกปิดใช้งานแล้ว กรุณาติดต่อผู้ดูแลระบบ",
        };
    }

    if (!(await compare(password, user.password))) {
        return { success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }

    await syncSystemAdminRole({
        id: user.id,
        email: user.email,
        role: user.role,
    });

    return {
        success: true,
        token: await createUserSession(user.id, headerGetter),
        redirectTo: "/dashboard",
    };
}
