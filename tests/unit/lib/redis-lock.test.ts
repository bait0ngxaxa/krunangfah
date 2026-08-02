import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    acquireRedisLock,
    releaseRedisLock,
    type RedisLock,
} from "@/lib/cache/redis-lock";

const mocks = vi.hoisted(() => ({
    getRedisClient: vi.fn(),
    sendCommand: vi.fn(),
    eval: vi.fn(),
}));

vi.mock("@/lib/cache/redis", () => ({
    getRedisClient: mocks.getRedisClient,
}));

describe("lib/redis-lock", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getRedisClient.mockResolvedValue({
            sendCommand: mocks.sendCommand,
            eval: mocks.eval,
        });
        mocks.sendCommand.mockResolvedValue("OK");
        mocks.eval.mockResolvedValue(1);
    });

    it("acquires locks with SET NX EX", async () => {
        const result = await acquireRedisLock("lock:test", 30);

        expect(result.status).toBe("acquired");
        if (result.status !== "acquired") {
            throw new Error("Expected Redis lock to be acquired");
        }
        expect(result.lock).toMatchObject({ key: "lock:test" });
        expect(result.lock.token).toHaveLength(32);
        expect(mocks.sendCommand).toHaveBeenCalledWith([
            "SET",
            "lock:test",
            expect.any(String),
            "NX",
            "EX",
            "30",
        ]);
    });

    it("returns contended when the lock is already held", async () => {
        mocks.sendCommand.mockResolvedValue(null);

        const result = await acquireRedisLock("lock:test", 30);

        expect(result).toEqual({ status: "contended" });
    });

    it("releases locks only when the token matches", async () => {
        const lock: RedisLock = { key: "lock:test", token: "token-1" };

        await releaseRedisLock(lock);

        expect(mocks.eval).toHaveBeenCalledWith(expect.any(String), {
            keys: ["lock:test"],
            arguments: ["token-1"],
        });

        const script = mocks.eval.mock.calls[0]?.[0] as string;
        expect(script).toContain('redis.call("GET", KEYS[1]) == ARGV[1]');
        expect(script).toContain('redis.call("DEL", KEYS[1])');
    });

    it("does not delete a lock held by another token", async () => {
        const currentToken = "other-token";
        let deleted = false;
        mocks.eval.mockImplementation(
            async (
                _script: string,
                options: { keys: string[]; arguments: string[] },
            ) => {
                if (currentToken === options.arguments[0]) {
                    deleted = true;
                }
                return deleted ? 1 : 0;
            },
        );

        await releaseRedisLock({ key: "lock:test", token: "token-1" });

        expect(deleted).toBe(false);
    });

    it("returns unavailable when the Redis client is unavailable", async () => {
        mocks.getRedisClient.mockResolvedValue(null);

        const result = await acquireRedisLock("lock:test", 30);

        expect(result).toEqual({
            status: "unavailable",
            reason: "client_unavailable",
        });
        expect(mocks.sendCommand).not.toHaveBeenCalled();
        expect(mocks.eval).not.toHaveBeenCalled();
    });

    it("returns unavailable when Redis lock acquisition errors", async () => {
        mocks.sendCommand.mockRejectedValue(new Error("Redis unavailable"));

        const result = await acquireRedisLock("lock:test", 30);

        expect(result).toEqual({
            status: "unavailable",
            reason: "command_failed",
        });
    });
});
