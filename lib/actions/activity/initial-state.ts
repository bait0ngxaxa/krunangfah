import { ActivityStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { getActivityIndices } from "./constants";

export function buildInitialActivityProgressRecords(
    studentId: string,
    phqResultId: string,
    riskLevel: string,
    unlockedAt: Date = new Date(),
): Prisma.ActivityProgressCreateManyInput[] {
    return getActivityIndices(riskLevel).map((activityNumber, index) => ({
        studentId,
        phqResultId,
        activityNumber,
        status:
            index === 0 ? ActivityStatus.in_progress : ActivityStatus.locked,
        unlockedAt: index === 0 ? unlockedAt : null,
    }));
}
