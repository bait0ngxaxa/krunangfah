import { createClient } from "redis";
import { logError } from "@/lib/utils/logging";

type RedisClient = ReturnType<typeof createClient>;

let clientPromise: Promise<RedisClient | null> | null = null;
let hasLoggedMissingUrl = false;

function getRedisUrl(): string | null {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        if (!hasLoggedMissingUrl && process.env.NODE_ENV === "production") {
            hasLoggedMissingUrl = true;
            logError("REDIS_URL is not configured");
        }
        return null;
    }

    return redisUrl;
}

export function getRedisClient(): Promise<RedisClient | null> {
    if (clientPromise) {
        return clientPromise;
    }

    clientPromise = (async () => {
        const redisUrl = getRedisUrl();
        if (!redisUrl) {
            return null;
        }

        const client = createClient({ url: redisUrl });
        client.on("error", (error: unknown) => {
            logError("Redis client error:", error);
        });

        try {
            await client.connect();
            return client;
        } catch (error) {
            clientPromise = null;
            logError("Redis connection error:", error);
            return null;
        }
    })();

    return clientPromise;
}
