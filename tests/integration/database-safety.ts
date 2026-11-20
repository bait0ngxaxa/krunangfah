import type { PrismaClient } from "@prisma/client";

// The worker installs a client only after the read-only database attestation succeeds.
const databaseGlobal = globalThis as { prisma?: PrismaClient };
let verifiedClient: PrismaClient | undefined;

export function installVerifiedIntegrationClient(client: PrismaClient): void {
    if (databaseGlobal.prisma) throw new Error("A database client already exists in the integration worker.");
    verifiedClient = client;
    databaseGlobal.prisma = client;
}

export function assertVerifiedIntegrationClient(client: PrismaClient): void {
    if (!verifiedClient || client !== verifiedClient || client !== databaseGlobal.prisma) {
        throw new Error("Integration cleanup requires the verified disposable database client.");
    }
}
