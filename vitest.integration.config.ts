import { defineConfig } from "vitest/config";
import path from "path";

process.env.ALLOW_REAL_PRISMA_TESTS = "true";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/integration/**/*.test.ts"],
        exclude: ["node_modules/**"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
