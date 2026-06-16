import { revalidatePath, updateTag } from "next/cache";
import { revalidateRedisAnalyticsCache } from "./redis-cache";

const ANALYTICS_TAG = "analytics";
export const ANALYTICS_OVERVIEW_TAG = "analytics-overview";

function getAnalyticsSchoolTag(schoolId: string): string {
    return `analytics:school:${schoolId}`;
}

export function getAnalyticsCacheTags(schoolId?: string): string[] {
    if (!schoolId) {
        return [ANALYTICS_TAG];
    }

    return [ANALYTICS_TAG, getAnalyticsSchoolTag(schoolId)];
}

export async function revalidateAnalyticsCache(schoolId?: string): Promise<void> {
    await revalidateRedisAnalyticsCache(schoolId);
    updateTag(ANALYTICS_TAG);
    updateTag(ANALYTICS_OVERVIEW_TAG);
    revalidatePath("/analytics");

    if (schoolId) {
        updateTag(getAnalyticsSchoolTag(schoolId));
    }
}
