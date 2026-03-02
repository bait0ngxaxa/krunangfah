import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "tests/",
                "*.config.*",
                ".next/",
                "prisma/",
                "lib/actions/user-management.actions.ts",
                "lib/actions/academic-year.actions.ts",
                "lib/actions/dashboard.actions.ts",
                "lib/actions/navbar.actions.ts",
                "lib/actions/auth.actions.ts",
                "lib/actions/teacher.actions.ts",
                "lib/actions/activity/**",
                "lib/actions/student/**",
                "lib/actions/analytics/transforms.ts",
                "components/**",
                "app/**",
            ],
            thresholds: {
                lines: 60,
                functions: 70,
                branches: 60,
                statements: 60,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
