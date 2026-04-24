import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types/auth.types";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";

interface FreshAccessClaims {
    role: UserRole;
    isPrimary: boolean;
    schoolId: string | null;
}

async function getFreshAccessClaims(
    userId: string,
): Promise<FreshAccessClaims | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isPrimary: true, schoolId: true },
    });

    if (!user) return null;

    return {
        role: user.role as UserRole,
        isPrimary: user.isPrimary,
        schoolId: user.schoolId,
    };
}

/**
 * Get current session on server side
 * Wrapped with React.cache() for per-request deduplication —
 * multiple calls within the same request (layout → page → component)
 * will only hit the auth layer once.
 * @returns Session object or null
 */
export const getServerSession = cache(async () => {
    return await auth();
});

/**
 * Require authentication - redirects to signin if not authenticated.
 * Uses redirect() instead of throw to prevent error page loops
 * when JWT references a deleted user (e.g. after DB reset).
 * @returns Session object (never returns if unauthenticated)
 */
export async function requireAuth() {
    const session = await getServerSession();

    if (!session || !session.user) {
        redirect("/signin");
    }

    const freshClaims = await getFreshAccessClaims(session.user.id);
    if (!freshClaims) {
        redirect("/signin");
    }

    return {
        ...session,
        user: {
            ...session.user,
            role: freshClaims.role,
            isPrimary: freshClaims.isPrimary,
            schoolId: freshClaims.schoolId,
        },
    } satisfies Session;
}

/**
 * Require admin role - throws if not system_admin
 * @returns Session object
 * @throws Error if not authenticated or not admin
 */
export async function requireAdmin() {
    const session = await requireAuth();

    if (session.user.role !== "system_admin") {
        throw new Error("Forbidden: Admin access required");
    }

    return session;
}

/**
 * Check if user role is system_admin
 */
export function isSystemAdmin(role: string): boolean {
    return role === "system_admin";
}

/**
 * Require primary school admin - throws if not the school_admin invited by system_admin
 * Used to protect roster, class, and invite management actions
 * @returns Session object
 * @throws Error if not authenticated, not school_admin, or not primary
 */
export async function requirePrimaryAdmin() {
    const session = await requireAuth();

    if (session.user.role !== "school_admin" || !session.user.isPrimary) {
        throw new Error("Forbidden: Primary school admin access required");
    }

    return session;
}
