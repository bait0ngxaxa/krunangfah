/**
 * Session helpers - wrapper functions around NextAuth's auth()
 *
 * ใช้สำหรับตรวจสอบ session และสิทธิ์ผู้ใช้ใน Server Components / Server Actions
 * NextAuth config อยู่ที่ @/auth (root)
 */

import { auth } from "@/auth";

/**
 * Get current session on server side
 * @returns Session object or null
 */
export async function getServerSession() {
    return await auth();
}

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
