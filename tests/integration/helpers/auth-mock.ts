/**
 * Auth Mock Helper for Integration Tests
 *
 * Mocks @/auth and @/lib/session to simulate different user sessions.
 * Each test file should call createMockUsers() to get unique user IDs.
 */

import { vi } from "vitest";

export interface MockUser {
    id: string;
    name: string;
    email: string;
    role: "system_admin" | "school_admin" | "class_teacher";
    isPrimary?: boolean;
    schoolId?: string;
}

interface MockSession {
    user: MockUser;
    expires: string;
}

let currentSession: MockSession | null = null;

export function mockSession(user: MockUser) {
    currentSession = {
        user,
        expires: new Date(Date.now() + 86400000).toISOString(),
    };
}

export function mockUnauthenticated() {
    currentSession = null;
}

export function getMockSession() {
    return currentSession;
}

export function setupAuthMocks() {
    vi.mock("@/auth", () => ({
        auth: vi.fn(() => Promise.resolve(getMockSession())),
    }));

    vi.mock("@/lib/session", () => ({
        getServerSession: vi.fn(() => Promise.resolve(getMockSession())),
        requireAuth: vi.fn(async () => {
            const session = getMockSession();
            if (!session || !session.user) {
                throw new Error("Unauthorized");
            }
            return session;
        }),
        requireAdmin: vi.fn(async () => {
            const session = getMockSession();
            if (!session || !session.user) {
                throw new Error("Unauthorized");
            }
            if (session.user.role !== "system_admin") {
                throw new Error("Forbidden: Admin access required");
            }
            return session;
        }),
        requirePrimaryAdmin: vi.fn(async () => {
            const session = getMockSession();
            if (!session || !session.user) {
                throw new Error("Unauthorized");
            }
            if (
                session.user.role !== "school_admin" ||
                !session.user.isPrimary
            ) {
                throw new Error(
                    "Forbidden: Primary school admin access required",
                );
            }
            return session;
        }),
        isSystemAdmin: vi.fn((role: string) => role === "system_admin"),
    }));

    vi.mock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
        unstable_cache: vi.fn(
            (fn: (...args: unknown[]) => unknown) =>
                (...args: unknown[]) =>
                    fn(...args),
        ),
    }));

    vi.mock("next/headers", () => ({
        headers: vi.fn(() => new Map()),
        cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
    }));
}

/**
 * Create a unique set of mock users for a test suite.
 * Each call returns users with unique IDs to prevent cross-file conflicts.
 */
export function createMockUsers(prefix: string) {
    const uid = `${prefix}-${Date.now().toString(36)}`;
    return {
        systemAdmin: {
            id: `sa-${uid}`,
            name: "Test Admin",
            email: `sa-${uid}@test.local`,
            role: "system_admin" as const,
        } as MockUser,
        schoolAdmin: {
            id: `sca-${uid}`,
            name: "Test School Admin",
            email: `sca-${uid}@test.local`,
            role: "school_admin" as const,
            isPrimary: true,
            schoolId: "",
        } as MockUser,
        classTeacher: {
            id: `ct-${uid}`,
            name: "Test Teacher",
            email: `ct-${uid}@test.local`,
            role: "class_teacher" as const,
            schoolId: "",
        } as MockUser,
        otherTeacher: {
            id: `ot-${uid}`,
            name: "Other Teacher",
            email: `ot-${uid}@test.local`,
            role: "class_teacher" as const,
            schoolId: "",
        } as MockUser,
    };
}
