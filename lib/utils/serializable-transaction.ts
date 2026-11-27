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
            // Raw queries surface serialization failures as P2010 with
            // meta.code = SQLSTATE instead of P2034; verified against PostgreSQL
            // in tests/integration/serializable-transaction-retry.test.ts.
            // Re-verify if the project adopts a Prisma driver adapter: that path
            // reports P2010 with meta.driverAdapterError instead of meta.code.
            const isRetryableError =
                error instanceof Prisma.PrismaClientKnownRequestError &&
                (error.code === "P2034" ||
                    (error.code === "P2010" && error.meta?.code === "40001"));

            if (!isRetryableError || attempt === maxRetries - 1) {
                throw error;
            }
        }
    }

    throw new Error("Transaction retry limit exceeded");
}
