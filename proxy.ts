import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createRateLimiter, extractRateLimitKey } from "@/lib/rate-limit";
import { RATE_LIMIT_AUTH_GENERAL } from "@/lib/constants/rate-limit";
import {
    attachRateLimitHeaders,
    createRateLimitApiResponse,
} from "@/lib/rate-limit-response";

// Rate limiter singletons (persist across requests)
// Note: signin rate limiting is handled in auth.ts authorize() function
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

// Routes ที่ต้องเป็น school_admin หรือ system_admin
const adminOnlyRoutes = ["/teachers/add", "/teachers/manage"];

// Routes ที่ต้องเป็น system_admin เท่านั้น
const systemAdminOnlyRoutes = ["/admin/invites", "/admin/users"];

// Routes สำหรับ guest เท่านั้น (ถ้า login แล้วจะ redirect ไป dashboard)
const guestOnlyRoutes = ["/signin", "/forgot-password", "/reset-password"];

export default auth((req) => {
    const { nextUrl, auth: session } = req;
    const pathname = nextUrl.pathname;

    // ─── Rate Limiting: Auth API routes (POST only) ───
    // Note: signin rate limiting is handled in auth.ts authorize() function
    // to properly return error messages through NextAuth
    if (pathname.startsWith("/api/auth/") && req.method === "POST") {
        const rateLimitKey = extractRateLimitKey((name) =>
            req.headers.get(name),
        );

        // Skip rate limiting for signin endpoint (handled in auth.ts)
        if (pathname === "/api/auth/callback/credentials") {
            return NextResponse.next();
        }

        // General limit for other auth POST requests
        const result = generalAuthLimiter.check(rateLimitKey);
        if (!result.allowed) {
            return createRateLimitApiResponse(result);
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

    // ─── Onboarding redirects ───
    // Both teacher profile and schoolId checks are in (protected)/layout.tsx via DB query
    // No JWT-based onboarding check here — avoids stale JWT loop

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
