import { compare } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/database/prisma";
import {
    createRateLimiter,
    extractClientIp,
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
import { logError } from "@/lib/utils/logging";
import {
    bumpUserSessionVersion,
    deleteCachedSession,
    deleteUserSessionCaches,
    getCachedSession,
    getUserSessionVersion,
    setCachedSession,
    type CachedSessionPayload,
} from "@/lib/auth/session-cache";
import type { ExtendedUser, UserRole } from "@/types/auth.types";

export const SESSION_COOKIE_NAME = "krunangfah_session";

const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;
const SESSION_ROTATE_AFTER_MS = 6 * 60 * 60 * 1000;
const SESSION_TOKEN_BYTES = 32;
const UNKNOWN_DEVICE_LABEL = "อุปกรณ์ไม่ทราบชนิด";
const SESSION_ACTIVITY_FLUSH_INTERVAL_MS = 60 * 1000;

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

interface DbSessionWithUser {
    id: string;
    expiresAt: Date;
    revokedAt: Date | null;
    lastActivityAt: Date;
    user: {
        id: string;
        email: string | null;
        name: string | null;
        image: string | null;
        role: string;
        isPrimary: boolean;
        schoolId: string | null;
        emailVerified: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    };
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
        lastIpPrefix: getIpPrefix(
            extractClientIp(headerGetter, TRUSTED_PROXY_HEADERS),
        ),
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

function createSessionPayload(
    session: DbSessionWithUser,
    now: Date,
    sessionVersion: number,
    activityPersistedAt = now,
): CachedSessionPayload {
    return {
        sessionId: session.id,
        user: toExtendedUser({
            ...session.user,
            role: session.user.role as UserRole,
        }),
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: session.revokedAt?.toISOString() ?? null,
        lastActivityAt: now.toISOString(),
        activityPersistedAt: activityPersistedAt.toISOString(),
        sessionVersion,
    };
}

function toSession(payload: CachedSessionPayload): Session {
    return {
        sessionId: payload.sessionId,
        expires: payload.expiresAt,
        user: payload.user,
    };
}

function isCachedSessionValid(
    payload: CachedSessionPayload,
    now: Date,
    currentVersion: number,
): boolean {
    const expiresAt = new Date(payload.expiresAt);
    const lastActivityAt = new Date(payload.lastActivityAt);

    if (payload.revokedAt) {
        return false;
    }

    if (
        Number.isNaN(expiresAt.getTime()) ||
        Number.isNaN(lastActivityAt.getTime())
    ) {
        return false;
    }

    if (expiresAt <= now) {
        return false;
    }

    if (isCachedSessionVersionStale(payload, currentVersion)) {
        return false;
    }

    return !hasCachedSessionIdleTimedOut(payload, now);
}

function getCachedSessionVersion(payload: CachedSessionPayload): number {
    return Number.isFinite(payload.sessionVersion)
        ? payload.sessionVersion
        : 0;
}

function isCachedSessionVersionStale(
    payload: CachedSessionPayload,
    currentVersion: number,
): boolean {
    return currentVersion > 0 && getCachedSessionVersion(payload) < currentVersion;
}

function hasCachedSessionIdleTimedOut(
    payload: CachedSessionPayload,
    now: Date,
): boolean {
    const lastActivityAt = new Date(payload.lastActivityAt);
    if (Number.isNaN(lastActivityAt.getTime())) {
        return false;
    }

    return now.getTime() - lastActivityAt.getTime() > IDLE_TIMEOUT_MS;
}

function shouldPersistActivity(
    payload: CachedSessionPayload,
    now: Date,
): boolean {
    return shouldPersistActivityAt(new Date(payload.activityPersistedAt), now);
}

function shouldPersistActivityAt(
    activityPersistedAt: Date,
    now: Date,
): boolean {
    if (Number.isNaN(activityPersistedAt.getTime())) {
        return true;
    }

    return (
        now.getTime() - activityPersistedAt.getTime() >=
        SESSION_ACTIVITY_FLUSH_INTERVAL_MS
    );
}

function getActivityFlushThreshold(now: Date): Date {
    return new Date(now.getTime() - SESSION_ACTIVITY_FLUSH_INTERVAL_MS);
}

async function persistSessionActivity(
    sessionId: string,
    now: Date,
    context: string,
): Promise<void> {
    try {
        await prisma.userSession.updateMany({
            where: {
                id: sessionId,
                lastActivityAt: { lte: getActivityFlushThreshold(now) },
            },
            data: { lastActivityAt: now },
        });
    } catch (error) {
        logError(context, error);
    }
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
    const rateLimitKey = extractRateLimitKey(
        headerGetter,
        TRUSTED_PROXY_HEADERS,
    );
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
    const tokenHash = hashSessionToken(token);
    const now = new Date();
    const metadata = getSessionMetadata(headerGetter);

    const session = await prisma.userSession.create({
        data: {
            sessionTokenHash: tokenHash,
            userId,
            expiresAt: getSessionExpiry(now),
            lastActivityAt: now,
            tokenRotatedAt: now,
            ...metadata,
        },
        include: { user: true },
    }) as DbSessionWithUser;

    const sessionVersion = await getUserSessionVersion(userId);
    await setCachedSession(
        tokenHash,
        createSessionPayload(session, now, sessionVersion),
    );

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
    const tokenHash = hashSessionToken(token);
    await prisma.userSession.updateMany({
        where: { sessionTokenHash: tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    await deleteCachedSession(tokenHash);
}

export async function invalidateUserSessionCaches(
    userId: string,
): Promise<void> {
    await Promise.all([
        bumpUserSessionVersion(userId),
        deleteUserSessionCaches(userId),
    ]);
}

export async function revokeUserSessions(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    await invalidateUserSessionCaches(userId);
}

export async function revokeUserSessionById(
    userId: string,
    sessionId: string,
): Promise<void> {
    await prisma.userSession.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    await invalidateUserSessionCaches(userId);
}

export async function revokeOtherUserSessions(
    userId: string,
    currentSessionId: string | null,
): Promise<void> {
    await prisma.userSession.updateMany({
        where: {
            userId,
            revokedAt: null,
            id: currentSessionId ? { not: currentSessionId } : undefined,
        },
        data: { revokedAt: new Date() },
    });
    await invalidateUserSessionCaches(userId);
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

    const tokenHash = hashSessionToken(token);
    const cachedSession = await getCachedSession(tokenHash);
    if (cachedSession) {
        return cachedSession.sessionId;
    }

    const session = await prisma.userSession.findUnique({
        where: { sessionTokenHash: tokenHash },
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

    const tokenHash = hashSessionToken(token);
    await prisma.userSession.updateMany({
        where: {
            sessionTokenHash: tokenHash,
            revokedAt: null,
        },
        data: getSessionMetadata(headerGetter),
    });
    await deleteCachedSession(tokenHash);
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
    const tokenHash = hashSessionToken(token);
    const session = await prisma.userSession.findUnique({
        where: { sessionTokenHash: tokenHash },
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
    const nextTokenHash = hashSessionToken(nextToken);
    await prisma.userSession.update({
        where: { id: session.id },
        data: {
            sessionTokenHash: nextTokenHash,
            tokenRotatedAt: now,
            lastActivityAt: now,
        },
    });
    await deleteCachedSession(tokenHash);

    return {
        token: nextToken,
        maxAgeSeconds: getSessionCookieMaxAge(session.expiresAt),
    };
}

export function getSessionCookieMaxAge(expiresAt: Date): number {
    return Math.max(Math.ceil((expiresAt.getTime() - Date.now()) / 1000), 0);
}

interface CachedSessionResolution {
    session: Session | null;
    shouldQueryDatabase: boolean;
}

async function resolveCachedSession(
    token: string,
    tokenHash: string,
    payload: CachedSessionPayload,
    now: Date,
): Promise<CachedSessionResolution> {
    const currentVersion = await getUserSessionVersion(payload.user.id);

    if (!isCachedSessionValid(payload, now, currentVersion)) {
        if (isCachedSessionVersionStale(payload, currentVersion)) {
            await deleteCachedSession(tokenHash);
            return { session: null, shouldQueryDatabase: true };
        }

        if (hasCachedSessionIdleTimedOut(payload, now)) {
            await revokeSessionToken(token);
        } else {
            await deleteCachedSession(tokenHash);
        }
        return { session: null, shouldQueryDatabase: false };
    }

    const shouldPersist = shouldPersistActivity(payload, now);
    const touchedSession: CachedSessionPayload = {
        ...payload,
        sessionVersion:
            currentVersion > 0 ? currentVersion : getCachedSessionVersion(payload),
        lastActivityAt: now.toISOString(),
        activityPersistedAt: shouldPersist
            ? now.toISOString()
            : payload.activityPersistedAt,
    };
    await setCachedSession(tokenHash, touchedSession);

    if (shouldPersist) {
        await persistSessionActivity(
            payload.sessionId,
            now,
            "Session cached activity update error:",
        );
    }

    return { session: toSession(touchedSession), shouldQueryDatabase: false };
}

async function getSessionByToken(token: string): Promise<Session | null> {
    const now = new Date();
    const tokenHash = hashSessionToken(token);
    const cachedSession = await getCachedSession(tokenHash);

    if (cachedSession) {
        const cached = await resolveCachedSession(
            token,
            tokenHash,
            cachedSession,
            now,
        );
        if (!cached.shouldQueryDatabase) {
            return cached.session;
        }
    }

    const session = await prisma.userSession.findUnique({
        where: { sessionTokenHash: tokenHash },
        include: { user: true },
    }) as DbSessionWithUser | null;

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

    const shouldPersist = shouldPersistActivityAt(session.lastActivityAt, now);
    const activityPersistedAt = shouldPersist ? now : session.lastActivityAt;

    if (shouldPersist) {
        await persistSessionActivity(
            session.id,
            now,
            "Session activity update error:",
        );
    }

    const sessionVersion = await getUserSessionVersion(session.user.id);
    const payload = createSessionPayload(
        session,
        now,
        sessionVersion,
        activityPersistedAt,
    );
    await setCachedSession(tokenHash, payload);

    return toSession(payload);
}
