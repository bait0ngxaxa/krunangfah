/**
 * Vitest Setup File
 * Global test configuration and mocks
 */

// Add any global test setup here
// For example: mock environment variables, global mocks, etc.

// Mock environment variables if needed
if (process.env.NODE_ENV !== "test") {
    Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        writable: true,
    });
}
