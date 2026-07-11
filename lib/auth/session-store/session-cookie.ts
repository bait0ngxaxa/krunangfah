import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { SESSION_MAX_AGE_SECONDS } from "./session-token";

export const SESSION_COOKIE_NAME = "krunangfah_session";

const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
};

export function attachSessionCookie(
    response: NextResponse,
    token: string,
    maxAgeSeconds = SESSION_MAX_AGE_SECONDS,
): NextResponse {
    response.cookies.set({
        ...SESSION_COOKIE_OPTIONS,
        name: SESSION_COOKIE_NAME,
        value: token,
        maxAge: maxAgeSeconds,
    });
    return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
    response.cookies.set({
        ...SESSION_COOKIE_OPTIONS,
        name: SESSION_COOKIE_NAME,
        value: "",
        maxAge: 0,
    });
    return response;
}

export async function getCurrentSessionToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function getSessionCookieMaxAge(expiresAt: Date): number {
    return Math.max(Math.ceil((expiresAt.getTime() - Date.now()) / 1000), 0);
}
