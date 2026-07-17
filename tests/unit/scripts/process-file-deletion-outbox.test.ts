import { readFile } from "fs/promises";
import { describe, expect, it } from "vitest";
import { transform } from "esbuild";

describe("file deletion cleanup script", () => {
    it("can be transformed to CommonJS without top-level await", async () => {
        const source = await readFile(
            "scripts/process-file-deletion-outbox.ts",
            "utf8",
        );

        await expect(
            transform(source, {
                format: "cjs",
                loader: "ts",
                platform: "node",
            }),
        ).resolves.toEqual(
            expect.objectContaining({ code: expect.any(String) }),
        );
    });
});
