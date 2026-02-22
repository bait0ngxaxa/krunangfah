/**
 * Session helpers - wrapper functions around NextAuth's auth()
 *
 * ใช้สำหรับตรวจสอบ session และสิทธิ์ผู้ใช้ใน Server Components / Server Actions
 * NextAuth config อยู่ที่ @/auth (root)
 */

import { auth } from "@/auth";
import { cache } from "react";

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
 * Require authentication - throws if not authenticated
 * @returns Session object
 * @throws Error if not authenticated
 */
export async function requireAuth() {
    const session = await getServerSession();

    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    return session;
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
