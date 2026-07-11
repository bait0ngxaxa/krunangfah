import { prisma } from "@/lib/database/prisma";
import { logError } from "@/lib/utils/logging";

const SESSION_ACTIVITY_FLUSH_INTERVAL_MS = 60 * 1000;

export function shouldPersistActivityAt(
    activityPersistedAt: Date,
    now: Date,
): boolean {
    if (Number.isNaN(activityPersistedAt.getTime())) {
        return true;
    }

    return (
        now.getTime() - activityPersistedAt.getTime() >=
        SESSION_ACTIVITY_FLUSH_INTERVAL_MS
    );
}

function getActivityFlushThreshold(now: Date): Date {
    return new Date(now.getTime() - SESSION_ACTIVITY_FLUSH_INTERVAL_MS);
}

export async function persistSessionActivity(
    sessionId: string,
    now: Date,
    context: string,
): Promise<void> {
    try {
        await prisma.userSession.updateMany({
            where: {
                id: sessionId,
                lastActivityAt: { lte: getActivityFlushThreshold(now) },
            },
            data: { lastActivityAt: now },
        });
    } catch (error) {
        logError(context, error);
    }
}
