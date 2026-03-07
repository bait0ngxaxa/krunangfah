import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { isSystemAdmin, requireAuth } from "@/lib/session";
import type { UserRole } from "@/types/auth.types";

export interface SessionUserContext {
    userId: string;
    role: UserRole;
    isPrimary: boolean;
    schoolId?: string;
}

export interface ViewerContext extends SessionUserContext {
    advisoryClass?: string;
}

export const getRequiredSessionUser = cache(
    async (): Promise<SessionUserContext> => {
        const session = await requireAuth();

        return {
            userId: session.user.id,
            role: session.user.role,
            isPrimary: session.user.isPrimary ?? false,
            schoolId: session.user.schoolId ?? undefined,
        };
    },
);

export const getViewerContext = cache(async (): Promise<ViewerContext> => {
    const sessionUser = await getRequiredSessionUser();
    const dbUser = await prisma.user.findUnique({
        where: { id: sessionUser.userId },
        select: {
            schoolId: true,
            teacher: { select: { advisoryClass: true } },
        },
    });

    return {
        ...sessionUser,
        schoolId: isSystemAdmin(sessionUser.role)
            ? undefined
            : (dbUser?.schoolId ?? sessionUser.schoolId),
        advisoryClass: dbUser?.teacher?.advisoryClass ?? undefined,
    };
});
