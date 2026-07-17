import { prisma } from "@/lib/database/prisma";
import { processFileDeletionOutbox } from "@/lib/services/file-deletion-outbox";

async function main(): Promise<void> {
    const result = await processFileDeletionOutbox();
    console.info("File deletion cleanup completed:", result);
    if (result.failed > 0) process.exitCode = 1;
}

async function run(): Promise<void> {
    try {
        await main();
    } finally {
        await prisma.$disconnect();
    }
}

void run().catch((error: unknown) => {
    console.error("File deletion cleanup failed:", error);
    process.exitCode = 1;
});
