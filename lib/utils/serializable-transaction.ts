import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";

const DEFAULT_MAX_RETRIES = 3;

export async function runSerializableTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await prisma.$transaction(callback, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            });
        } catch (error) {
            const isRetryableError =
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2034";

            if (!isRetryableError || attempt === maxRetries - 1) {
                throw error;
            }
        }
    }

    throw new Error("Transaction retry limit exceeded");
}
