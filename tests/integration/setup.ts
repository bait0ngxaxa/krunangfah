import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { afterAll } from "vitest";
import { assertIntegrationDatabaseIdentity, loadIntegrationDatabaseTarget } from "./database-target";
import { installVerifiedIntegrationClient } from "./database-safety";

const target = loadIntegrationDatabaseTarget(fileURLToPath(new URL("../..", import.meta.url)));
const client = new PrismaClient({ datasourceUrl: target.url });

try {
    const identity = await client.$queryRaw<Parameters<typeof assertIntegrationDatabaseIdentity>[0][]>`
        SELECT d.datname::text AS "databaseName", session_user::text AS "loginRole",
               pg_catalog.shobj_description(d.oid, 'pg_database') AS "marker",
               (current_user <> session_user OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
                OR d.datdba = r.oid OR EXISTS (
                    SELECT 1 FROM pg_catalog.pg_auth_members AS membership WHERE membership.member = r.oid
                )) AS "privileged"
        FROM pg_catalog.pg_database AS d
        JOIN pg_catalog.pg_roles AS r ON r.rolname = session_user
        WHERE d.datname = pg_catalog.current_database()
    `;
    assertIntegrationDatabaseIdentity(identity[0], target.marker);
    installVerifiedIntegrationClient(client);
} catch {
    await client.$disconnect();
    throw new Error("Disposable integration database could not be verified. Check the local setup and authorization marker.");
}

afterAll(async () => {
    await client.$disconnect();
});
