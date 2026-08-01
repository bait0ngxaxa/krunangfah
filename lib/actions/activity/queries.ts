"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import { handleQueryError } from "../error-handler";
import {
    queryEmpty,
    queryForbidden,
    querySuccess,
    type QueryResult,
} from "../query-result";
import { verifyStudentActivityAccess } from "./access";

const activityProgressInclude = {
    worksheetUploads: {
        orderBy: { worksheetNumber: "asc" as const },
    },
    teacher: {
        select: {
            name: true,
            email: true,
            teacher: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
        },
    },
} satisfies Prisma.ActivityProgressInclude;

export type ActivityProgressData = Prisma.ActivityProgressGetPayload<{
    include: typeof activityProgressInclude;
}>;

/**
 * Get activity progress for a student
 */
export async function getActivityProgress(
    studentId: string,
    phqResultId: string,
): Promise<QueryResult<ActivityProgressData[]>> {
    try {
        const session = await requireAuth();

        // Verify user has access to this student
        const { allowed, error } = await verifyStudentActivityAccess(
            studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return queryForbidden(error || "ไม่มีสิทธิ์เข้าถึง");
        }

        const progress = await prisma.activityProgress.findMany({
            where: {
                studentId,
                phqResultId,
            },
            include: activityProgressInclude,
            orderBy: { activityNumber: "asc" },
        });

        return progress.length === 0
            ? queryEmpty(progress)
            : querySuccess(progress);
    } catch (error) {
        return handleQueryError("Error getting activity progress:", error);
    }
}
