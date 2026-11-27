import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";

// Constant SQL with no interpolation; raw-unsafe APIs are acceptable only here in test code.
const FORCE_SERIALIZATION_FAILURE =
    "DO $$ BEGIN RAISE EXCEPTION 'forced' USING ERRCODE = '40001'; END $$;";

describe("Integration: serializable transaction retry", () => {
    it("surfaces a raw-query SQLSTATE 40001 as P2010 with meta.code", async () => {
        const error = await prisma
            .$transaction(
                async (tx) => {
                    await tx.$executeRawUnsafe(FORCE_SERIALIZATION_FAILURE);
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            )
            .then(
                () => null,
                (caught: unknown) => caught,
            );

        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error).toMatchObject({ code: "P2010", meta: { code: "40001" } });
    });

    it("retries a transaction whose raw query fails with SQLSTATE 40001", async () => {
        let attempts = 0;

        const result = await runSerializableTransaction(async (tx) => {
            attempts += 1;
            if (attempts === 1) {
                await tx.$executeRawUnsafe(FORCE_SERIALIZATION_FAILURE);
            }
            return "done";
        });

        expect(result).toBe("done");
        expect(attempts).toBe(2);
    });
});
