import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import type {
    SystemAdminEditChange,
    SystemAdminEditEventItem,
    SystemAdminEventActionKind,
    SystemAdminEventTargetKind,
} from "./types";

interface ActorSnapshot {
    id: string;
    email?: string | null;
    name?: string | null;
    role: string;
}

interface CreateSystemAdminEditEventInput {
    tx: Prisma.TransactionClient;
    targetType: SystemAdminEventTargetKind;
    targetId: string;
    targetLabel: string;
    action?: SystemAdminEventActionKind;
    reason: string;
    actor: ActorSnapshot;
    changes: SystemAdminEditChange[];
}

export async function createSystemAdminEditEvent({
    tx,
    targetType,
    targetId,
    targetLabel,
    action = "EDIT",
    reason,
    actor,
    changes,
}: CreateSystemAdminEditEventInput): Promise<void> {
    await tx.systemAdminEvent.create({
        data: {
            targetType,
            targetId,
            action,
            reason,
            actorUserId: actor.id,
            actorSnapshot: createActorSnapshot(actor),
            targetSnapshot: { id: targetId, label: targetLabel },
            changes: changesToJson(changes),
        },
    });
}

export async function listSystemAdminEditEvents(
    take = 50,
): Promise<SystemAdminEditEventItem[]> {
    const events = await prisma.systemAdminEvent.findMany({
        orderBy: { createdAt: "desc" },
        take,
    });
    return events.map(toSystemAdminEditEventItem);
}

function createActorSnapshot(actor: ActorSnapshot): Prisma.InputJsonObject {
    return {
        id: actor.id,
        email: actor.email ?? null,
        name: actor.name ?? null,
        role: actor.role,
    };
}

function changesToJson(
    changes: SystemAdminEditChange[],
): Prisma.InputJsonArray {
    return changes.map((change) => ({
        field: change.field,
        label: change.label,
        before: change.before,
        after: change.after,
    }));
}

export function toSystemAdminEditEventItem(event: {
    id: string;
    action: SystemAdminEventActionKind;
    targetType: SystemAdminEventTargetKind;
    targetId: string;
    reason: string;
    actorSnapshot: Prisma.JsonValue;
    targetSnapshot: Prisma.JsonValue;
    changes: Prisma.JsonValue;
    createdAt: Date;
}): SystemAdminEditEventItem {
    const actor = readObject(event.actorSnapshot);
    const target = readObject(event.targetSnapshot);
    return {
        id: event.id,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        reason: event.reason,
        actorEmail: readString(actor.email),
        targetLabel: readString(target.label) ?? event.targetId,
        changes: readChanges(event.changes),
        createdAt: event.createdAt,
    };
}

function readObject(value: Prisma.JsonValue): Prisma.JsonObject {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value;
}

function readString(value: Prisma.JsonValue | undefined): string | null {
    return typeof value === "string" ? value : null;
}

function readChanges(value: Prisma.JsonValue): SystemAdminEditChange[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const field = readString(item.field);
        const label = readString(item.label);
        if (!field || !label) return [];
        return [{
            field,
            label,
            before: readScalar(item.before),
            after: readScalar(item.after),
        }];
    });
}

function readScalar(
    value: Prisma.JsonValue | undefined,
): SystemAdminEditChange["before"] {
    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
    ) {
        return value;
    }
    return null;
}
