import { randomBytes } from "crypto";
import { getRedisClient } from "@/lib/redis";
import { logError } from "@/lib/utils/logging";

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end
return 0
`;

export interface RedisLock {
    key: string;
    token: string;
}

function createLockToken(): string {
    return randomBytes(16).toString("hex");
}

export async function acquireRedisLock(
    key: string,
    ttlSeconds: number,
): Promise<RedisLock | null> {
    const client = await getRedisClient();
    if (!client) {
        return { key, token: "redis-unavailable" };
    }

    const token = createLockToken();
    try {
        const result: unknown = await client.sendCommand([
            "SET",
            key,
            token,
            "NX",
            "EX",
            ttlSeconds.toString(),
        ]);

        return result === "OK" ? { key, token } : null;
    } catch (error) {
        logError("Redis lock acquire error:", error);
        return { key, token: "redis-error" };
    }
}

export async function releaseRedisLock(lock: RedisLock): Promise<void> {
    if (lock.token === "redis-unavailable" || lock.token === "redis-error") {
        return;
    }

    const client = await getRedisClient();
    if (!client) {
        return;
    }

    try {
        await client.eval(RELEASE_LOCK_SCRIPT, {
            keys: [lock.key],
            arguments: [lock.token],
        });
    } catch (error) {
        logError("Redis lock release error:", error);
    }
}
