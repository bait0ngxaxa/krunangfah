import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const DATABASE_NAME = "krunangfah_integration";
const RUNNER_ROLE = "krunangfah_integration_runner";
const MARKER_PREFIX = "krunangfah-integration:";

export interface IntegrationDatabaseTarget {
    url: string;
    marker: string;
}

function postgresUrl(value: string): URL | null {
    try {
        const url = new URL(value);
        decodeURIComponent(url.username);
        decodeURIComponent(url.password);
        decodeURIComponent(url.pathname);
        return url.protocol === "postgresql:" || url.protocol === "postgres:" ? url : null;
    } catch {
        return null;
    }
}

function databaseLocation(url: URL): string {
    // Ignore credentials, query options and the protocol spelling when comparing destinations.
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    const host = ["localhost", "[::1]", "127.0.0.1"].includes(hostname) ? "loopback" : hostname;
    return `${host}:${url.port || "5432"}${decodeURIComponent(url.pathname)}`;
}

export function resolveIntegrationDatabase(env: Readonly<Record<string, string | undefined>>, applicationUrls: readonly string[]): IntegrationDatabaseTarget {
    if (!env.TEST_DATABASE_URL) throw new Error("Set TEST_DATABASE_URL for the disposable integration database.");
    const url = postgresUrl(env.TEST_DATABASE_URL);
    if (!url) throw new Error("TEST_DATABASE_URL is not a valid PostgreSQL URL.");
    const location = databaseLocation(url);
    for (const candidate of [...applicationUrls, env.DATABASE_URL, env.DIRECT_URL]) {
        const appUrl = candidate && postgresUrl(candidate);
        if (appUrl && databaseLocation(appUrl) === location) {
            throw new Error("Integration database matches an application database destination.");
        }
    }

    if (url.hostname !== "127.0.0.1" || !url.port || Number(url.port) < 1 || url.pathname !== `/${DATABASE_NAME}` ||
        url.username !== RUNNER_ROLE || !url.password || url.href.includes("?") || url.href.includes("#")) {
        throw new Error("Integration database must use the allowlisted loopback destination and limited runner role.");
    }

    const authorization = env.TEST_DATABASE_AUTHORIZATION;
    if (!authorization || !/^[0-9a-f]{64}$/.test(authorization)) {
        throw new Error("Set TEST_DATABASE_AUTHORIZATION to the database provisioning marker.");
    }
    return { url: url.href, marker: `${MARKER_PREFIX}${authorization}` };
}

export function loadIntegrationDatabaseTarget(root: string): IntegrationDatabaseTarget {
    const urls = [
        ".env", ".env.local", ".env.development", ".env.development.local",
        ".env.test", ".env.test.local", ".env.production", ".env.production.local", "prisma/.env",
    ].flatMap((name) => {
        const path = join(root, name);
        if (!existsSync(path)) return [];
        try {
            const { DATABASE_URL, DIRECT_URL } = parseEnv(readFileSync(path, "utf8"));
            return [DATABASE_URL, DIRECT_URL].filter((value): value is string => typeof value === "string");
        } catch {
            throw new Error("Could not inspect application database configuration safely.");
        }
    });
    return resolveIntegrationDatabase(process.env, urls);
}

interface DatabaseIdentity {
    databaseName: string;
    loginRole: string;
    marker: string | null;
    privileged: boolean;
}

export function assertIntegrationDatabaseIdentity(identity: DatabaseIdentity | undefined, expectedMarker: string): void {
    if (identity?.databaseName !== DATABASE_NAME || identity.loginRole !== RUNNER_ROLE ||
        identity.marker !== expectedMarker || identity.privileged !== false) {
        throw new Error("Disposable integration database could not be verified.");
    }
}
