import { revalidateTag } from "next/cache";

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

export function revalidateAnalyticsCache(schoolId?: string): void {
    revalidateTag(ANALYTICS_TAG, "default");
    revalidateTag(ANALYTICS_OVERVIEW_TAG, "default");

    if (schoolId) {
        revalidateTag(getAnalyticsSchoolTag(schoolId), "default");
    }
}
