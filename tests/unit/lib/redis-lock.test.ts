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
        const lock = await acquireRedisLock("lock:test", 30);

        expect(lock).toMatchObject({ key: "lock:test" });
        expect(lock?.token).toHaveLength(32);
        expect(mocks.sendCommand).toHaveBeenCalledWith([
            "SET",
            "lock:test",
            expect.any(String),
            "NX",
            "EX",
            "30",
        ]);
    });

    it("returns null when the lock is already held", async () => {
        mocks.sendCommand.mockResolvedValue(null);

        const lock = await acquireRedisLock("lock:test", 30);

        expect(lock).toBeNull();
    });

    it("releases locks only when the token matches", async () => {
        const lock: RedisLock = { key: "lock:test", token: "token-1" };

        await releaseRedisLock(lock);

        expect(mocks.eval).toHaveBeenCalledWith(expect.any(String), {
            keys: ["lock:test"],
            arguments: ["token-1"],
        });
    });

    it("allows fallback execution when Redis is unavailable", async () => {
        mocks.getRedisClient.mockResolvedValue(null);

        const lock = await acquireRedisLock("lock:test", 30);
        await releaseRedisLock(lock as RedisLock);

        expect(lock).toEqual({
            key: "lock:test",
            token: "redis-unavailable",
        });
        expect(mocks.sendCommand).not.toHaveBeenCalled();
        expect(mocks.eval).not.toHaveBeenCalled();
    });
});
