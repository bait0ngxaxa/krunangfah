import { prisma } from "@/lib/database/prisma";
import { processFileDeletionOutbox } from "@/lib/services/file-deletion-outbox";

async function main(): Promise<void> {
    const result = await processFileDeletionOutbox();
    console.info("File deletion cleanup completed:", result);
    if (result.failed > 0) process.exitCode = 1;
}

try {
    await main();
} finally {
    await prisma.$disconnect();
}
