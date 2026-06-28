import { createClient } from "redis";
import type { RateLimitConfig, RateLimiter } from "@/types/rate-limit.types";

type RedisClient = ReturnType<typeof createClient>;

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local member = ARGV[4]
local window_start = now - window_ms

redis.call("ZREMRANGEBYSCORE", key, 0, window_start)

local count = redis.call("ZCARD", key)
if count >= max_requests then
    local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")[2]
    local reset_at_ms = tonumber(oldest) + window_ms
    local retry_after = math.max(math.ceil((reset_at_ms - now) / 1000), 1)
    return {0, max_requests, 0, math.ceil(reset_at_ms / 1000), retry_after}
end

redis.call("ZADD", key, now, member)
redis.call("PEXPIRE", key, window_ms)

return {
    1,
    max_requests,
    max_requests - count - 1,
    math.ceil((now + window_ms) / 1000),
    0
}
`;

let clientPromise: Promise<RedisClient> | null = null;

function getRedisUrl(): string {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error("REDIS_URL is required when RATE_LIMIT_DRIVER=redis");
    }

    return redisUrl;
}

function getRedisClient(): Promise<RedisClient> {
    if (clientPromise) {
        return clientPromise;
    }

    clientPromise = (async () => {
        const client = createClient({ url: getRedisUrl() });
        client.on("error", (error: unknown) => {
            console.error(
                "Redis rate limiter error:",
                error instanceof Error ? error.message : "Unknown error",
            );
        });
        await client.connect();
        return client;
    })();

    return clientPromise;
}

function parseRedisResult(value: unknown): [number, number, number, number, number] {
    if (!Array.isArray(value) || value.length !== 5) {
        throw new Error("Invalid Redis rate-limit response");
    }

    const parsed = value.map((item) => Number(item));
    if (parsed.some((item) => !Number.isFinite(item))) {
        throw new Error("Invalid Redis rate-limit response values");
    }

    return [
        parsed[0],
        parsed[1],
        parsed[2],
        parsed[3],
        parsed[4],
    ];
}

function createRedisKey(config: RateLimitConfig, key: string): string {
    return `rate_limit:${config.name}:${key}`;
}

function createRedisMember(now: number): string {
    return `${now}:${process.pid}:${Math.random().toString(36).slice(2)}`;
}

export function createRedisRateLimiter(config: RateLimitConfig): RateLimiter {
    return {
        async check(key) {
            const client = await getRedisClient();
            const now = Date.now();
            const result = await client.eval(SLIDING_WINDOW_SCRIPT, {
                keys: [createRedisKey(config, key)],
                arguments: [
                    now.toString(),
                    config.windowMs.toString(),
                    config.maxRequests.toString(),
                    createRedisMember(now),
                ],
            });
            const [allowed, limit, remaining, resetAt, retryAfterSeconds] =
                parseRedisResult(result);

            return {
                allowed: allowed === 1,
                limit,
                remaining,
                resetAt,
                retryAfterSeconds,
            };
        },
        async cleanup() {
            return;
        },
        async destroy() {
            return;
        },
    };
}
