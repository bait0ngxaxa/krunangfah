import { getRedisClient } from "@/lib/cache/redis";
import { logError } from "@/lib/utils/logging";

type IdempotencyStatus = "processing" | "completed";

interface IdempotencyRecord {
    status: IdempotencyStatus;
    result?: unknown;
}

export type IdempotencyStartResult =
    | { status: "started" }
    | { status: "processing" }
    | { status: "completed"; result: unknown }
    | { status: "unavailable" };

function parseIdempotencyRecord(value: string | null): IdempotencyRecord | null {
    if (!value) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(value);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return null;
        }

        const record = parsed as Record<string, unknown>;
        if (record.status !== "processing" && record.status !== "completed") {
            return null;
        }

        return {
            status: record.status,
            result: record.result,
        };
    } catch (error) {
        logError("Redis idempotency parse error:", error);
        return null;
    }
}

export async function startIdempotentOperation(
    key: string,
    ttlSeconds: number,
): Promise<IdempotencyStartResult> {
    const client = await getRedisClient();
    if (!client) {
        return { status: "unavailable" };
    }

    try {
        const result: unknown = await client.sendCommand([
            "SET",
            key,
            JSON.stringify({ status: "processing" }),
            "NX",
            "EX",
            ttlSeconds.toString(),
        ]);

        if (result === "OK") {
            return { status: "started" };
        }

        const existing = parseIdempotencyRecord(await client.get(key));
        if (existing?.status === "completed") {
            return { status: "completed", result: existing.result };
        }

        return { status: "processing" };
    } catch (error) {
        logError("Redis idempotency start error:", error);
        return { status: "unavailable" };
    }
}

export async function completeIdempotentOperation(
    key: string,
    ttlSeconds: number,
    result: unknown,
): Promise<void> {
    const client = await getRedisClient();
    if (!client) {
        return;
    }

    try {
        await client.setEx(
            key,
            ttlSeconds,
            JSON.stringify({ status: "completed", result }),
        );
    } catch (error) {
        logError("Redis idempotency complete error:", error);
    }
}

export async function clearIdempotentOperation(key: string): Promise<void> {
    const client = await getRedisClient();
    if (!client) {
        return;
    }

    try {
        await client.del(key);
    } catch (error) {
        logError("Redis idempotency clear error:", error);
    }
}
