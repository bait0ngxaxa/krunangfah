import { defineConfig } from "vitest/config";
import path from "path";
import { loadIntegrationDatabaseTarget } from "./tests/integration/database-target";

loadIntegrationDatabaseTarget(__dirname);

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        env: {
            NODE_ENV: "test",
        },
        setupFiles: ["./tests/integration/setup.ts"],
        // Files share academic-term fixtures that another file's cleanup can delete.
        fileParallelism: false,
        include: ["tests/integration/**/*.test.ts"],
        exclude: ["node_modules/**"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
