import { getRedisClient } from "@/lib/cache/redis";
import { logError } from "@/lib/utils/logging";

export type RedisMarkerRead =
    | { status: "present"; value: string }
    | { status: "absent" }
    | { status: "unavailable" };

export async function readRedisMarker(key: string): Promise<RedisMarkerRead> {
    try {
        const client = await getRedisClient();
        if (!client) return { status: "unavailable" };

        const value = await client.get(key);
        return typeof value === "string"
            ? { status: "present", value }
            : { status: "absent" };
    } catch (error) {
        logError("Redis marker read error:", error);
        return { status: "unavailable" };
    }
}

/** Returns false when Redis could not store the marker. */
export async function writeRedisMarker(
    key: string,
    value: string,
    ttlSeconds: number,
): Promise<boolean> {
    try {
        const client = await getRedisClient();
        if (!client) return false;

        const result: unknown = await client.sendCommand([
            "SET",
            key,
            value,
            "EX",
            ttlSeconds.toString(),
        ]);
        return result === "OK";
    } catch (error) {
        logError("Redis marker write error:", error);
        return false;
    }
}

export async function deleteRedisMarker(key: string): Promise<void> {
    try {
        const client = await getRedisClient();
        if (!client) return;

        await client.del(key);
    } catch (error) {
        logError("Redis marker delete error:", error);
    }
}
