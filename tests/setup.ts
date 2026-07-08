/**
 * Vitest Setup File
 * Global test configuration and safety guards.
 */

// Mock environment variables if needed
if (process.env.NODE_ENV !== "test") {
    Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        writable: true,
    });
}

if (process.env.DATABASE_URL) {
    process.env.__REAL_DATABASE_URL_FORBIDDEN_IN_TESTS = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
}
