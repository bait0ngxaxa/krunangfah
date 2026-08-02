import { randomBytes } from "crypto";
import { getRedisClient } from "@/lib/cache/redis";
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

export type AcquireRedisLockResult =
    | {
          status: "acquired";
          lock: RedisLock;
      }
    | {
          status: "contended";
      }
    | {
          status: "unavailable";
          reason: "client_unavailable" | "command_failed";
      };

function createLockToken(): string {
    return randomBytes(16).toString("hex");
}

export async function acquireRedisLock(
    key: string,
    ttlSeconds: number,
): Promise<AcquireRedisLockResult> {
    const token = createLockToken();
    try {
        const client = await getRedisClient();
        if (!client) {
            return {
                status: "unavailable",
                reason: "client_unavailable",
            };
        }

        const result: unknown = await client.sendCommand([
            "SET",
            key,
            token,
            "NX",
            "EX",
            ttlSeconds.toString(),
        ]);

        if (result !== "OK") {
            return { status: "contended" };
        }

        return {
            status: "acquired",
            lock: { key, token },
        };
    } catch (error) {
        logError("Redis lock acquire error:", error);
        return {
            status: "unavailable",
            reason: "command_failed",
        };
    }
}

export async function releaseRedisLock(lock: RedisLock): Promise<void> {
    try {
        const client = await getRedisClient();
        if (!client) {
            return;
        }

        await client.eval(RELEASE_LOCK_SCRIPT, {
            keys: [lock.key],
            arguments: [lock.token],
        });
    } catch (error) {
        logError("Redis lock release error:", error);
    }
}
