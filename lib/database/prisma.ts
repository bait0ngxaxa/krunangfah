/**
 * Prisma Client Instance
 * Singleton pattern to prevent multiple instances in development
 */

import { PrismaClient } from "@prisma/client";

if (
    process.env.NODE_ENV === "test" &&
    process.env.ALLOW_REAL_PRISMA_TESTS !== "true"
) {
    throw new Error(
        "Tests must mock @/lib/database/prisma. Real DATABASE_URL access is blocked.",
    );
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === "development"
                ? ["error", "warn"]
                : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
