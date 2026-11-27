import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const transaction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/database/prisma", () => ({ prisma: { $transaction: transaction } }));

const { runSerializableTransaction } = await import("@/lib/utils/serializable-transaction");

function prismaError(code: string, meta?: Record<string, unknown>): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError("failed", { code, clientVersion: "test", meta });
}

describe("runSerializableTransaction", () => {
    beforeEach(() => {
        transaction.mockReset();
    });

    // The P2010 shape mirrors what Prisma produced against PostgreSQL in
    // tests/integration/serializable-transaction-retry.test.ts.
    it.each([
        ["a write conflict", prismaError("P2034")],
        ["a raw-query serialization failure", prismaError("P2010", { code: "40001", message: "forced" })],
    ])("retries %s", async (_label, error) => {
        transaction.mockRejectedValueOnce(error).mockResolvedValueOnce("done");

        await expect(runSerializableTransaction(async () => "done")).resolves.toBe("done");
        expect(transaction).toHaveBeenCalledTimes(2);
    });

    it("does not retry other raw-query failures", async () => {
        const error = prismaError("P2010", { code: "42P01", message: "relation does not exist" });
        transaction.mockRejectedValue(error);

        await expect(runSerializableTransaction(async () => "done")).rejects.toBe(error);
        expect(transaction).toHaveBeenCalledTimes(1);
    });
});
