import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    findMany: vi.fn(),
    update: vi.fn(),
    unlink: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        fileDeletionOutbox: {
            findMany: mocks.findMany,
            update: mocks.update,
        },
    },
}));
vi.mock("fs/promises", () => ({ unlink: mocks.unlink }));
vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));

const { processFileDeletionOutbox } = await import(
    "@/lib/services/file-deletion-outbox"
);

describe("processFileDeletionOutbox", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-17T03:00:00.000Z"));
        mocks.update.mockResolvedValue({});
    });

    it("marks a queued file processed only after unlink succeeds", async () => {
        mocks.findMany.mockResolvedValue([
            {
                id: "job-1",
                fileUrl: "/api/uploads/home-visits/photo.webp",
                attempts: 0,
            },
        ]);
        mocks.unlink.mockResolvedValue(undefined);

        const result = await processFileDeletionOutbox();

        expect(result).toEqual({ processed: 1, failed: 0 });
        expect(mocks.unlink).toHaveBeenCalledWith(
            expect.stringMatching(/[\\/]home-visits[\\/]photo\.webp$/),
        );
        expect(mocks.update).toHaveBeenCalledWith({
            where: { id: "job-1" },
            data: {
                processedAt: new Date("2026-07-17T03:00:00.000Z"),
                lastError: null,
            },
        });
    });

    it("keeps a failed job pending and records a retry instead of swallowing the error", async () => {
        mocks.findMany.mockResolvedValue([
            {
                id: "job-2",
                fileUrl: "/api/uploads/home-visits/locked.webp",
                attempts: 0,
            },
        ]);
        mocks.unlink.mockRejectedValue(new Error("file is locked"));

        const result = await processFileDeletionOutbox();

        expect(result).toEqual({ processed: 0, failed: 1 });
        expect(mocks.update).toHaveBeenCalledWith({
            where: { id: "job-2" },
            data: {
                attempts: 1,
                lastError: "file is locked",
                nextAttemptAt: new Date("2026-07-17T03:02:00.000Z"),
            },
        });
        expect(mocks.logError).toHaveBeenCalledWith(
            "File deletion outbox cleanup failed:",
            expect.any(Error),
        );
    });

    it("treats a missing file as an idempotent cleanup success", async () => {
        mocks.findMany.mockResolvedValue([
            {
                id: "job-3",
                fileUrl: "/api/uploads/home-visits/missing.webp",
                attempts: 2,
            },
        ]);
        mocks.unlink.mockRejectedValue(
            Object.assign(new Error("missing"), { code: "ENOENT" }),
        );

        const result = await processFileDeletionOutbox();

        expect(result).toEqual({ processed: 1, failed: 0 });
        expect(mocks.update).toHaveBeenCalledWith({
            where: { id: "job-3" },
            data: {
                processedAt: new Date("2026-07-17T03:00:00.000Z"),
                lastError: null,
            },
        });
    });
});
