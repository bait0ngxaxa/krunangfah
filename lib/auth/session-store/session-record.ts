import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import type { CachedSessionPayload } from "@/lib/auth/session-cache";
import type { ExtendedUser } from "@/types/auth.types";

export const SESSION_USER_INCLUDE = {
    user: {
        include: {
            school: { select: { disabledAt: true } },
        },
    },
} satisfies Prisma.UserSessionInclude;

export type DbSessionWithUser = Prisma.UserSessionGetPayload<{
    include: typeof SESSION_USER_INCLUDE;
}>;

function toExtendedUser(user: DbSessionWithUser["user"]): ExtendedUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        isPrimary: user.isPrimary,
        schoolId: user.schoolId,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export function createSessionPayload(
    session: DbSessionWithUser,
    now: Date,
    sessionVersion: number,
    activityPersistedAt = now,
): CachedSessionPayload {
    return {
        sessionId: session.id,
        user: toExtendedUser(session.user),
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: session.revokedAt?.toISOString() ?? null,
        lastActivityAt: now.toISOString(),
        activityPersistedAt: activityPersistedAt.toISOString(),
        sessionVersion,
    };
}

export function toSession(payload: CachedSessionPayload): Session {
    return {
        sessionId: payload.sessionId,
        expires: payload.expiresAt,
        user: payload.user,
    };
}
