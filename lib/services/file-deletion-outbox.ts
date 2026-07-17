import { unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/database/prisma";
import { logError } from "@/lib/utils/logging";

const HOME_VISIT_UPLOAD_PREFIX = "/api/uploads/home-visits/";
const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 100;
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1_000;

interface FileSystemError {
    code?: unknown;
    message?: unknown;
}

export interface FileDeletionCleanupResult {
    processed: number;
    failed: number;
}

function getHomeVisitFilePath(fileUrl: string): string | null {
    if (!fileUrl.startsWith(HOME_VISIT_UPLOAD_PREFIX)) return null;

    const fileName = fileUrl.slice(HOME_VISIT_UPLOAD_PREFIX.length);
    if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
        return null;
    }

    return join(process.cwd(), ".data", "uploads", "home-visits", fileName);
}

function isMissingFileError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) return false;
    return (error as FileSystemError).code === "ENOENT";
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message.slice(0, 1_000);
    return "Unknown file cleanup error";
}

function getNextAttemptAt(attempts: number): Date {
    const delayMs = Math.min(2 ** attempts * 60_000, MAX_BACKOFF_MS);
    return new Date(Date.now() + delayMs);
}

async function deleteQueuedFile(fileUrl: string): Promise<void> {
    const filePath = getHomeVisitFilePath(fileUrl);
    if (!filePath) throw new Error("Unsupported file URL");

    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is constrained to the home-visit upload directory
        await unlink(filePath);
    } catch (error) {
        if (!isMissingFileError(error)) throw error;
    }
}

export async function processFileDeletionOutbox(
    batchSize = DEFAULT_BATCH_SIZE,
): Promise<FileDeletionCleanupResult> {
    const take = Math.min(Math.max(batchSize, 1), MAX_BATCH_SIZE);
    const jobs = await prisma.fileDeletionOutbox.findMany({
        where: {
            processedAt: null,
            nextAttemptAt: { lte: new Date() },
        },
        orderBy: { createdAt: "asc" },
        take,
    });

    let processed = 0;
    let failed = 0;
    for (const job of jobs) {
        try {
            await deleteQueuedFile(job.fileUrl);
            await prisma.fileDeletionOutbox.update({
                where: { id: job.id },
                data: { processedAt: new Date(), lastError: null },
            });
            processed += 1;
        } catch (error) {
            const attempts = job.attempts + 1;
            await prisma.fileDeletionOutbox.update({
                where: { id: job.id },
                data: {
                    attempts,
                    lastError: getErrorMessage(error),
                    nextAttemptAt: getNextAttemptAt(attempts),
                },
            });
            logError("File deletion outbox cleanup failed:", error);
            failed += 1;
        }
    }

    return { processed, failed };
}
