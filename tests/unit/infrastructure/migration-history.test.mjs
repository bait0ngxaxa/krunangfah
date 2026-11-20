import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";

const checker = fileURLToPath(new URL("../../../scripts/check-migration-history.mjs", import.meta.url));
const initial = "20240229120000_init";
let repo;
let migrations;

function git(...args) {
    return execFileSync("git", ["-c", "core.autocrlf=false", ...args], { cwd: repo, encoding: "utf8" }).trim();
}

function commit() {
    git("add", "--all");
    git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.test",
        "-c", "commit.gpgsign=false", "commit", "-qm", "Fixture update");
}

function addMigration(name, sql = "SELECT 1;\n") {
    mkdirSync(join(migrations, name), { recursive: true });
    writeFileSync(join(migrations, name, "migration.sql"), sql, "utf8");
}

function check(base = "refs/heads/baseline") {
    return spawnSync(process.execPath, [checker, base], { cwd: repo, encoding: "utf8" });
}

beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "krunangfah-migrations-"));
    migrations = join(repo, "prisma", "migrations");
    git("init", "-q", "-b", "baseline");
    addMigration(initial);
    writeFileSync(join(migrations, "migration_lock.toml"), 'provider = "postgresql"\n', "utf8");
    commit();
    git("switch", "-qc", "proposed");
});

afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
});

it("accepts unchanged committed history", () => {
    const result = check();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
});

it("accepts a later migration with unchanged historical SQL", () => {
    addMigration("20240301000000_add_table");
    commit();
    const result = check();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("(2 migrations)");
});

it.each([
    ["backdated", () => addMigration("20240228120000_backdated"), /must sort after/],
    ["same timestamp as base", () => addMigration("20240229120000_duplicate"), /duplicates the timestamp/],
    ["same timestamp among proposals", () => {
        addMigration("20240301010000_first");
        addMigration("20240301010000_second");
    }, /duplicates the timestamp/],
    ["invalid date", () => addMigration("20250229120000_invalid"), /Invalid calendar timestamp/],
    ["malformed name", () => addMigration("next-Migration"), /Invalid migration name/],
    ["deleted history", () => rmSync(join(migrations, initial), { recursive: true }), /renamed or removed|No migration directories/],
    ["renamed history", () => renameSync(join(migrations, initial), join(migrations, "20240301000000_renamed")), /renamed or removed/],
    ["modified SQL of equal size", () => addMigration(initial, "SELECT 2;\n"), /was modified/],
    ["historical SQL replaced with empty file", () => addMigration(initial, ""), /is empty/],
    ["unexpected structure", () => {
        writeFileSync(join(migrations, initial, "extra.sql"), "SELECT 1;\n", "utf8");
    }, /Unexpected migration entry/],
    ["changed provider", () => {
        writeFileSync(join(migrations, "migration_lock.toml"), 'provider = "sqlite"\n', "utf8");
    }, /PostgreSQL provider/],
])("rejects %s in committed history", (_name, mutate, message) => {
    mutate();
    commit();
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(message);
});

it("fails closed when the base ref cannot be resolved", () => {
    const result = check("refs/heads/missing");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Cannot resolve migration baseline");
});

it("fails closed when the base commit has no migration tree", () => {
    rmSync(migrations, { recursive: true });
    commit();
    const unreadable = git("rev-parse", "HEAD");
    git("switch", "-q", "baseline");
    const result = check(unreadable);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing regular migration_lock.toml");
});
