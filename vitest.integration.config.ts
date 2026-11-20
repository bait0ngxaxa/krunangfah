import { defineConfig } from "vitest/config";
import path from "path";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
    throw new Error("Set TEST_DATABASE_URL to a dedicated disposable PostgreSQL database.");
}

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        env: {
            NODE_ENV: "test",
            ALLOW_REAL_PRISMA_TESTS: "true",
            DATABASE_URL: testDatabaseUrl,
            DIRECT_URL: testDatabaseUrl,
        },
        include: ["tests/integration/**/*.test.ts"],
        exclude: ["node_modules/**"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
