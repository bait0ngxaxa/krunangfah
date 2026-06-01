import { compare } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
    createRateLimiter,
    extractClientIp,
    extractRateLimitKey,
} from "@/lib/rate-limit";
import {
    RATE_LIMIT_AUTH_FLOOD,
    RATE_LIMIT_AUTH_SIGNIN,
} from "@/lib/constants/rate-limit";
import {
    createRateLimitMessage,
    encodeNextAuthRateLimitCode,
    pickRateLimitResult,
} from "@/lib/rate-limit-errors";
import { createEmailRateLimitKey } from "@/lib/rate-limit-keys";
import { signInSchema } from "@/lib/validations/auth.validation";
import { logError } from "@/lib/utils/logging";
import type { ExtendedUser, UserRole } from "@/types/auth.types";

export const SESSION_COOKIE_NAME = "krunangfah_session";

const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;
const SESSION_ROTATE_AFTER_MS = 6 * 60 * 60 * 1000;
const SESSION_TOKEN_BYTES = 32;
const UNKNOWN_DEVICE_LABEL = "อุปกรณ์ไม่ทราบชนิด";

const signinAttemptLimiter = createRateLimiter(RATE_LIMIT_AUTH_SIGNIN);
const signinFloodLimiter = createRateLimiter(RATE_LIMIT_AUTH_FLOOD);

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

interface SessionMetadata {
    userAgentLabel: string;
    userAgentHash: string | null;
    lastIpPrefix: string | null;
}

function createSessionToken(): string {
    return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

function hashSessionToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function hashText(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

function getIpPrefix(ip: string): string | null {
    if (ip === "unknown") {
        return null;
    }

    if (ip.includes(".")) {
        const parts = ip.split(".");
        return parts.length === 4 ? `${parts.slice(0, 3).join(".")}.0/24` : null;
    }

    if (ip.includes(":")) {
        const groups = ip.split(":").filter(Boolean).slice(0, 4);
        return groups.length > 0 ? `${groups.join(":")}::/64` : null;
    }

    return null;
}

function getBrowserName(userAgent: string): string {
    if (/Edg\//.test(userAgent)) return "Microsoft Edge";
    if (/Chrome\//.test(userAgent) && !/Chromium\//.test(userAgent)) {
        return "Chrome";
    }
    if (/Firefox\//.test(userAgent)) return "Firefox";
    if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) {
        return "Safari";
    }
    return "Browser";
}

function getDeviceName(userAgent: string): string {
    if (/iPhone|Android.+Mobile/.test(userAgent)) return "มือถือ";
    if (/iPad|Tablet|Android/.test(userAgent)) return "แท็บเล็ต";
    return "คอมพิวเตอร์";
}

function getUserAgentLabel(userAgent: string | null): string {
    if (!userAgent) {
        return UNKNOWN_DEVICE_LABEL;
    }

    return `${getBrowserName(userAgent)} บน${getDeviceName(userAgent)}`;
}

function getSessionMetadata(
    headerGetter: (name: string) => string | null,
): SessionMetadata {
    const userAgent = headerGetter("user-agent");

    return {
        userAgentLabel: getUserAgentLabel(userAgent),
        userAgentHash: userAgent ? hashText(userAgent) : null,
        lastIpPrefix: getIpPrefix(extractClientIp(headerGetter)),
    };
}

function getSessionExpiry(now: Date): Date {
    return new Date(now.getTime() + SESSION_MAX_AGE_MS);
}

function toExtendedUser(user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    role: UserRole;
    isPrimary: boolean;
    schoolId: string | null;
    emailVerified: Date | null;
    createdAt: Date;
    updatedAt: Date;
}): ExtendedUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        isPrimary: user.isPrimary,
        schoolId: user.schoolId,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

async function syncSystemAdminRole(user: {
    id: string;
    email: string;
    role: UserRole;
}): Promise<UserRole> {
    const whitelisted = await prisma.systemAdminWhitelist.findUnique({
        where: { email: user.email, isActive: true },
        select: { id: true },
    });

    if (whitelisted && user.role !== "system_admin") {
        await prisma.user.update({
            where: { id: user.id },
            data: { role: "system_admin" },
        });
        return "system_admin";
    }

    if (!whitelisted && user.role === "system_admin") {
        await prisma.user.update({
            where: { id: user.id },
            data: { role: "school_admin" },
        });
        return "school_admin";
    }

    return user.role;
}

async function checkSigninRateLimit(
    email: string,
    headerGetter: (name: string) => string | null,
): Promise<SignInFailure | null> {
    const rateLimitKey = extractRateLimitKey(headerGetter);
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
    headerGetter: (name: string) => string | null,
): Promise<string> {
    const token = createSessionToken();
    const now = new Date();
    const metadata = getSessionMetadata(headerGetter);

    await prisma.userSession.create({
        data: {
            sessionTokenHash: hashSessionToken(token),
            userId,
            expiresAt: getSessionExpiry(now),
            lastActivityAt: now,
            tokenRotatedAt: now,
            ...metadata,
        },
    });

    return token;
}

export async function signInWithPassword(
    input: unknown,
    headerGetter: (name: string) => string | null,
): Promise<StatefulSignInResult> {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, message: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" };
    }

    const { email, password } = parsed.data;
    const rateLimitFailure = await checkSigninRateLimit(email, headerGetter);
    if (rateLimitFailure) {
        return rateLimitFailure;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt || !user.password) {
        return { success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }

    const passwordValid = await compare(password, user.password);
    if (!passwordValid) {
        return { success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }

    await syncSystemAdminRole({
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
    });

    return {
        success: true,
        token: await createUserSession(user.id, headerGetter),
        redirectTo: "/dashboard",
    };
}

export function attachSessionCookie(
    response: NextResponse,
    token: string,
    maxAgeSeconds = SESSION_MAX_AGE_SECONDS,
): NextResponse {
    response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: maxAgeSeconds,
    });
    return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
    response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
    return response;
}

export async function revokeSessionToken(token: string): Promise<void> {
    await prisma.userSession.updateMany({
        where: { sessionTokenHash: hashSessionToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

export async function revokeUserSessions(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

export async function getCurrentSessionToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentSessionId(): Promise<string | null> {
    const token = await getCurrentSessionToken();
    if (!token) {
        return null;
    }

    const session = await prisma.userSession.findUnique({
        where: { sessionTokenHash: hashSessionToken(token) },
        select: { id: true },
    });

    return session?.id ?? null;
}

export async function updateCurrentSessionMetadata(
    headerGetter: (name: string) => string | null,
): Promise<void> {
    const token = await getCurrentSessionToken();
    if (!token) {
        return;
    }

    await prisma.userSession.updateMany({
        where: {
            sessionTokenHash: hashSessionToken(token),
            revokedAt: null,
        },
        data: getSessionMetadata(headerGetter),
    });
}

export async function getRequestSession(): Promise<Session | null> {
    const token = await getCurrentSessionToken();
    if (!token) {
        return null;
    }

    return getSessionByToken(token);
}

interface RotatedSessionToken {
    token: string;
    maxAgeSeconds: number;
}

export async function rotateCurrentSessionToken(): Promise<RotatedSessionToken | null> {
    const token = await getCurrentSessionToken();
    if (!token) {
        return null;
    }

    const now = new Date();
    const session = await prisma.userSession.findUnique({
        where: { sessionTokenHash: hashSessionToken(token) },
        select: {
            id: true,
            expiresAt: true,
            revokedAt: true,
            tokenRotatedAt: true,
            user: { select: { deletedAt: true } },
        },
    });

    if (!session || session.revokedAt || session.expiresAt <= now) {
        return null;
    }

    if (session.user.deletedAt) {
        await revokeSessionToken(token);
        return null;
    }

    const shouldRotate =
        now.getTime() - session.tokenRotatedAt.getTime() >=
        SESSION_ROTATE_AFTER_MS;
    if (!shouldRotate) {
        return null;
    }

    const nextToken = createSessionToken();
    await prisma.userSession.update({
        where: { id: session.id },
        data: {
            sessionTokenHash: hashSessionToken(nextToken),
            tokenRotatedAt: now,
            lastActivityAt: now,
        },
    });

    return {
        token: nextToken,
        maxAgeSeconds: getSessionCookieMaxAge(session.expiresAt),
    };
}

export function getSessionCookieMaxAge(expiresAt: Date): number {
    return Math.max(Math.ceil((expiresAt.getTime() - Date.now()) / 1000), 0);
}

async function getSessionByToken(token: string): Promise<Session | null> {
    const now = new Date();
    const session = await prisma.userSession.findUnique({
        where: { sessionTokenHash: hashSessionToken(token) },
        include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= now) {
        return null;
    }

    if (now.getTime() - session.lastActivityAt.getTime() > IDLE_TIMEOUT_MS) {
        await revokeSessionToken(token);
        return null;
    }

    if (session.user.deletedAt) {
        await revokeSessionToken(token);
        return null;
    }

    try {
        await prisma.userSession.update({
            where: { id: session.id },
            data: { lastActivityAt: now },
        });
    } catch (error) {
        logError("Session activity update error:", error);
    }

    return {
        expires: session.expiresAt.toISOString(),
        user: toExtendedUser({
            ...session.user,
            role: session.user.role as UserRole,
        }),
    };
}
