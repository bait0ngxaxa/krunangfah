import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createRateLimiter, extractClientIp } from "@/lib/rate-limit";
import type { RateLimitResult } from "@/types/rate-limit.types";
import {
    RATE_LIMIT_AUTH_SIGNIN,
    RATE_LIMIT_AUTH_GENERAL,
} from "@/constants/rate-limit";

// Rate limiter singletons (persist across requests)
const signinLimiter = createRateLimiter(RATE_LIMIT_AUTH_SIGNIN);
const generalAuthLimiter = createRateLimiter(RATE_LIMIT_AUTH_GENERAL);

// Routes ที่ต้อง login
const protectedRoutes = [
    "/dashboard",
    "/teacher-profile",
    "/teachers",
    "/students",
    "/analytics",
    "/admin",
];

// Routes ที่ต้องเป็น school_admin หรือ system_admin
const adminOnlyRoutes = ["/teachers/add", "/teachers/manage"];

// Routes ที่ต้องเป็น system_admin เท่านั้น
const systemAdminOnlyRoutes = ["/admin/whitelist"];

// Routes สำหรับ guest เท่านั้น (ถ้า login แล้วจะ redirect ไป dashboard)
const guestOnlyRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password"];

/**
 * Build a 429 Too Many Requests response with rate limit headers
 */
function buildRateLimitResponse(result: RateLimitResult): NextResponse {
    const minutes = Math.ceil(result.retryAfterSeconds / 60);
    const timeMessage =
        minutes > 1 ? `${minutes} นาที` : `${result.retryAfterSeconds} วินาที`;

    return NextResponse.json(
        {
            error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: `ส่งคำขอมากเกินไป กรุณารออีก ${timeMessage}`,
            },
        },
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

/**
 * Attach rate limit info headers to an allowed response
 */
function attachRateLimitHeaders(
    response: NextResponse,
    result: RateLimitResult,
): NextResponse {
    response.headers.set("X-RateLimit-Limit", result.limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.resetAt.toString());
    return response;
}

export default auth((req) => {
    const { nextUrl, auth: session } = req;
    const pathname = nextUrl.pathname;

    // ─── Rate Limiting: Auth API routes (POST only) ───
    if (pathname.startsWith("/api/auth/") && req.method === "POST") {
        const ip = extractClientIp((name) => req.headers.get(name));

        // Stricter limit for credential login attempts
        if (pathname === "/api/auth/callback/credentials") {
            const result = signinLimiter.check(ip);
            if (!result.allowed) {
                return buildRateLimitResponse(result);
            }
            return attachRateLimitHeaders(NextResponse.next(), result);
        }

        // General limit for other auth POST requests
        const result = generalAuthLimiter.check(ip);
        if (!result.allowed) {
            return buildRateLimitResponse(result);
        }
        return attachRateLimitHeaders(NextResponse.next(), result);
    }

    // ─── Route Protection ───

    const isLoggedIn = !!session;
    const userRole = session?.user?.role;

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

    // ถ้าเป็น system_admin-only routes แต่ไม่ใช่ system_admin redirect ไป dashboard
    const isSystemAdminOnlyRoute = systemAdminOnlyRoutes.some((route) =>
        pathname.startsWith(route),
    );
    if (isSystemAdminOnlyRoute && userRole !== "system_admin") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    // ถ้าเป็น admin-only routes แต่ไม่ใช่ school_admin หรือ system_admin redirect ไป dashboard
    const isAdminOnlyRoute = adminOnlyRoutes.some((route) =>
        pathname.startsWith(route),
    );
    if (
        isAdminOnlyRoute &&
        userRole !== "school_admin" &&
        userRole !== "system_admin"
    ) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        // Page routes (exclude static assets and non-auth API routes)
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
        // Auth API routes (for rate limiting)
        "/api/auth/:path*",
    ],
};
