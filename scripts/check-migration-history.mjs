import { execFileSync } from "node:child_process";

const root = "prisma/migrations";
const lockPath = `${root}/migration_lock.toml`;
const timestampPattern = /^\d{14}$/u;
const wordPattern = /^[a-z0-9]+$/u;

function git(...args) {
    return execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

function resolveCommit(ref, label) {
    try {
        return git("rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`).trim();
    } catch {
        throw new Error(`Cannot resolve ${label} ${JSON.stringify(ref)}. Fetch the target branch history and try again.`);
    }
}

function timestampOf(name) {
    const [stamp, ...words] = name.split("_");
    if (!timestampPattern.test(stamp) || words.length === 0 || !words.every((word) => wordPattern.test(word))) {
        throw new Error(`Invalid migration name ${JSON.stringify(name)}: expected YYYYMMDDHHMMSS_lower_snake_case.`);
    }
    const [, year, month, day, hour, minute, second] = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/u.exec(stamp);
    const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== iso || year === "0000") {
        throw new Error(`Invalid calendar timestamp in migration "${name}".`);
    }
    return stamp;
}

function migrationTree(commit) {
    const entries = git("ls-tree", "-r", "-t", "-l", "-z", commit, "--", root).split("\0").filter(Boolean);
    const directories = new Set();
    const files = new Map();
    let lock;
    for (const entry of entries) {
        const tab = entry.indexOf("\t");
        const [mode, type, oid, size] = entry.slice(0, tab).split(/ +/u);
        const path = entry.slice(tab + 1);
        if ((path === "prisma" || path === root) && type === "tree") continue;
        const parts = path.slice(root.length + 1).split("/");
        if (path === lockPath && mode === "100644") {
            lock = oid;
        } else if (type === "tree" && parts.length === 1) {
            directories.add(parts[0]);
        } else if (parts.length === 2 && parts[1] === "migration.sql" && mode === "100644") {
            if (size === "0") throw new Error(`Migration ${JSON.stringify(path)} at ${commit} is empty.`);
            files.set(parts[0], oid);
        } else {
            throw new Error(`Unexpected migration entry ${JSON.stringify(path)} at ${commit}.`);
        }
    }
    if (!lock) throw new Error(`Missing regular migration_lock.toml at ${commit}.`);
    const settings = git("cat-file", "blob", lock).split(/\r?\n/u)
        .map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
    if (settings.length !== 1 || settings[0] !== 'provider = "postgresql"') {
        throw new Error(`migration_lock.toml at ${commit} must specify only the PostgreSQL provider.`);
    }
    if (directories.size === 0) throw new Error(`No migration directories at ${commit}.`);
    for (const name of directories) {
        if (!files.has(name)) throw new Error(`Migration ${JSON.stringify(name)} at ${commit} is missing migration.sql.`);
    }
    return files;
}

function checkHistory(base, current) {
    const timestamps = new Map();
    for (const [name, oid] of base) {
        if (!current.has(name)) throw new Error(`Committed migration ${JSON.stringify(name)} was renamed or removed.`);
        if (current.get(name) !== oid) throw new Error(`Committed migration "${name}/migration.sql" was modified.`);
        timestamps.set(timestampOf(name), name);
    }
    const latest = [...timestamps.keys()].sort().at(-1);
    for (const [name, oid] of current) {
        if (base.has(name)) continue;
        const stamp = timestampOf(name);
        if (timestamps.has(stamp)) throw new Error(`Migration "${name}" duplicates the timestamp of "${timestamps.get(stamp)}".`);
        if (stamp <= latest) throw new Error(`New migration "${name}" must sort after "${timestamps.get(latest)}".`);
        if (!git("cat-file", "blob", oid).trim()) throw new Error(`Migration "${name}/migration.sql" is empty.`);
        timestamps.set(stamp, name);
    }
}

try {
    const base = resolveCommit(process.argv[2] ?? "refs/remotes/origin/main", "migration baseline");
    const current = migrationTree(resolveCommit("HEAD", "HEAD"));
    checkHistory(migrationTree(base), current);
    process.stdout.write(`Migration history verified against ${base} (${current.size} migrations).\n`);
} catch (error) {
    console.error(`Migration history check failed: ${error.message}`);
    process.exitCode = 1;
}
