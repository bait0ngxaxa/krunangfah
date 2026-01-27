import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Routes ที่ต้อง login
const protectedRoutes = [
    "/dashboard",
    "/teacher-profile",
    "/teachers",
    "/students",
    "/analytics",
];

// Routes ที่ต้องเป็น school_admin เท่านั้น
const adminOnlyRoutes = ["/teachers/add", "/teachers/manage"];

// Routes สำหรับ guest เท่านั้น (ถ้า login แล้วจะ redirect ไป dashboard)
const guestOnlyRoutes = ["/signin", "/signup"];

export default auth((req) => {
    const { nextUrl, auth: session } = req;
    const pathname = nextUrl.pathname;
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

    // ถ้าเป็น admin-only routes แต่ไม่ใช่ school_admin redirect ไป dashboard
    const isAdminOnlyRoute = adminOnlyRoutes.some((route) =>
        pathname.startsWith(route),
    );
    if (isAdminOnlyRoute && userRole !== "school_admin") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
