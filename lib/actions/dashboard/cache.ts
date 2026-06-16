import { revalidatePath, updateTag } from "next/cache";

export const DASHBOARD_TAG = "dashboard";
export const SCHOOLS_TAG = "schools";

export function buildDashboardDataCacheKey(input: {
    userId: string;
    role: string;
}): string[] {
    return [
        "dashboard-data",
        `user:${input.userId}`,
        `role:${input.role}`,
    ];
}

export function buildSchoolsListCacheKey(): string[] {
    return ["schools-list"];
}

export function revalidateDashboardCache(): void {
    updateTag(DASHBOARD_TAG);
    updateTag(SCHOOLS_TAG);
    revalidatePath("/dashboard");
}
