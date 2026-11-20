import { describe, expect, it } from "vitest";
import { assertIntegrationDatabaseIdentity, resolveIntegrationDatabase } from "../../integration/database-target";

const login = "krunangfah_integration_runner";
const name = "krunangfah_integration";
const marker = "a".repeat(64);
const fixturePassword = "fixture-password";
const url = `postgresql://${login}:${fixturePassword}@127.0.0.1:55439/${name}`;
const authorized = { TEST_DATABASE_URL: url, TEST_DATABASE_AUTHORIZATION: marker };

describe("integration database target", () => {
    it("requires a configured URL and independently requires authorization", () => {
        expect(() => resolveIntegrationDatabase({}, [])).toThrow("Set TEST_DATABASE_URL");
        expect(() => resolveIntegrationDatabase({ TEST_DATABASE_URL: url }, [])).toThrow("Set TEST_DATABASE_AUTHORIZATION");
    });

    it("rejects malformed URLs without echoing credentials or the authorization marker", () => {
        const malformed = { ...authorized, TEST_DATABASE_URL: `postgresql://${login}:${fixturePassword}@` };
        expect(() => resolveIntegrationDatabase(malformed, [])).toThrow(/^TEST_DATABASE_URL is not a valid PostgreSQL URL\.$/);
    });

    it("rejects equivalent application database destinations from environment and dotenv files", () => {
        const app = `postgres://admin:other-password@LOCALHOST:55439/${name}?schema=other`;
        expect(() => resolveIntegrationDatabase({ ...authorized, DIRECT_URL: app }, [])).toThrow("matches an application database");
        expect(() => resolveIntegrationDatabase(authorized, [app])).toThrow("matches an application database");
    });

    it.each([
        url.replace("127.0.0.1", "db.service.internal"),
        url.replace(name, "some_test_db"),
        url.replace(login, "postgres"),
        `${url}?options=-csearch_path%3Dother`,
    ])("rejects a URL outside the fixed database identity", (TEST_DATABASE_URL) => {
        expect(() => resolveIntegrationDatabase({ ...authorized, TEST_DATABASE_URL }, [])).toThrow(/^Integration database must use the allowlisted loopback destination and limited runner role\.$/);
    });

    it("requires verified identity metadata and refuses elevated or unmarked accounts", () => {
        const target = resolveIntegrationDatabase(authorized, []);
        const identity = { databaseName: name, loginRole: login, marker: target.marker, privileged: false };
        expect(() => assertIntegrationDatabaseIdentity(identity, target.marker)).not.toThrow();
        expect(() => assertIntegrationDatabaseIdentity({ ...identity, marker: null }, target.marker)).toThrow("could not be verified");
        expect(() => assertIntegrationDatabaseIdentity({ ...identity, privileged: true }, target.marker)).toThrow("could not be verified");
        expect(() => assertIntegrationDatabaseIdentity(undefined, target.marker)).toThrow("could not be verified");
    });
});
