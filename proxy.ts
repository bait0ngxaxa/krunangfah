import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRateLimiter, extractRateLimitKey } from "@/lib/rate-limit";
import { RATE_LIMIT_AUTH_GENERAL } from "@/lib/constants/rate-limit";
import {
    attachRateLimitHeaders,
    createRateLimitApiResponse,
} from "@/lib/rate-limit-response";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-store";

// Rate limiter singletons (persist across requests)
// Note: signin rate limiting is handled in the stateful signin route.
const generalAuthLimiter = createRateLimiter(RATE_LIMIT_AUTH_GENERAL);

// Routes ที่ต้อง login
const protectedRoutes = [
    "/dashboard",
    "/school-setup",
    "/school",
    "/teacher-profile",
    "/teachers",
    "/students",
    "/analytics",
    "/admin",
    "/settings",
];

// Routes สำหรับ guest เท่านั้น (ถ้า login แล้วจะ redirect ไป dashboard)
const guestOnlyRoutes = ["/signin", "/forgot-password", "/reset-password"];

export default async function proxy(req: NextRequest) {
    const { nextUrl } = req;
    const pathname = nextUrl.pathname;

    // ─── Rate Limiting: Auth API routes (POST only) ───
    // Note: signin rate limiting is handled by /api/auth/signin.
    if (pathname.startsWith("/api/auth/") && req.method === "POST") {
        const rateLimitKey = extractRateLimitKey((name) =>
            req.headers.get(name),
        );

        // Skip stricter endpoints that have their own limiter.
        if (pathname === "/api/auth/signin") {
            return NextResponse.next();
        }

        // General limit for other auth POST requests
        const result = await generalAuthLimiter.check(rateLimitKey);
        if (!result.allowed) {
            return createRateLimitApiResponse(result);
        }
        return attachRateLimitHeaders(NextResponse.next(), result);
    }

    // ─── Route Protection ───

    const isLoggedIn = req.cookies.has(SESSION_COOKIE_NAME);
    // ถ้าเป็น public routes ให้ผ่าน
    if (pathname === "/" || pathname.startsWith("/invite/")) {
        return NextResponse.next();
    }

    // ถ้าเป็น guest-only routes และ login แล้ว redirect ไป dashboard
    const isGuestOnlyRoute = guestOnlyRoutes.some((route) =>
        pathname.startsWith(route),
    );
    if (isGuestOnlyRoute && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    // ถ้าเป็น protected routes แต่ยังไม่ได้ login redirect ไป signin
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route),
    );
    if (isProtectedRoute && !isLoggedIn) {
        return NextResponse.redirect(new URL("/signin", nextUrl));
    }

    // ─── Onboarding redirects ───
    // Both teacher profile and schoolId checks are in (protected)/layout.tsx via DB query
    // No cookie-claim onboarding check here — avoids stale session loops.

    // NOTE: Role-based checks must happen in server components/actions
    // using DB-refreshed claims (see requireAuth in lib/session.ts).
    // Avoid role gating in proxy because the cookie only proves session presence.

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Page routes (exclude static assets and non-auth API routes)
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
        // Auth API routes (for rate limiting)
        "/api/auth/:path*",
    ],
};
