import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    clearIdempotentOperation,
    completeIdempotentOperation,
    startIdempotentOperation,
} from "@/lib/cache/redis-idempotency";

const mocks = vi.hoisted(() => ({
    getRedisClient: vi.fn(),
    sendCommand: vi.fn(),
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
}));

vi.mock("@/lib/cache/redis", () => ({
    getRedisClient: mocks.getRedisClient,
}));

describe("lib/redis-idempotency", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getRedisClient.mockResolvedValue({
            sendCommand: mocks.sendCommand,
            get: mocks.get,
            setEx: mocks.setEx,
            del: mocks.del,
        });
        mocks.sendCommand.mockResolvedValue("OK");
        mocks.get.mockResolvedValue(null);
        mocks.setEx.mockResolvedValue("OK");
        mocks.del.mockResolvedValue(1);
    });

    it("starts a new operation with SET NX EX", async () => {
        const result = await startIdempotentOperation("idem:test", 1800);

        expect(result).toEqual({ status: "started" });
        expect(mocks.sendCommand).toHaveBeenCalledWith([
            "SET",
            "idem:test",
            JSON.stringify({ status: "processing" }),
            "NX",
            "EX",
            "1800",
        ]);
    });

    it("returns processing when another operation is running", async () => {
        mocks.sendCommand.mockResolvedValue(null);
        mocks.get.mockResolvedValue(JSON.stringify({ status: "processing" }));

        const result = await startIdempotentOperation("idem:test", 1800);

        expect(result).toEqual({ status: "processing" });
    });

    it("returns a completed result when a prior operation finished", async () => {
        const cachedResult = {
            success: true,
            status: "success",
            message: "นำเข้าสำเร็จทั้งหมด 1 คน",
        };
        mocks.sendCommand.mockResolvedValue(null);
        mocks.get.mockResolvedValue(
            JSON.stringify({ status: "completed", result: cachedResult }),
        );

        const result = await startIdempotentOperation("idem:test", 1800);

        expect(result).toEqual({
            status: "completed",
            result: cachedResult,
        });
    });

    it("stores completed operation results", async () => {
        const result = {
            success: true,
            status: "success",
            message: "นำเข้าสำเร็จทั้งหมด 1 คน",
        };

        await completeIdempotentOperation("idem:test", 1800, result);

        expect(mocks.setEx).toHaveBeenCalledWith(
            "idem:test",
            1800,
            JSON.stringify({ status: "completed", result }),
        );
    });

    it("clears operation records", async () => {
        await clearIdempotentOperation("idem:test");

        expect(mocks.del).toHaveBeenCalledWith("idem:test");
    });
});
