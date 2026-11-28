"use server";

import { unstable_cache } from "next/cache";
import { getViewerContext } from "@/lib/auth/viewer-context";
import { fetchAnalyticsData } from "./data";
import { fetchSystemAnalyticsOverview } from "./system-overview";
import {
    ANALYTICS_OVERVIEW_TAG,
    getAnalyticsCacheTags,
} from "./cache";
import {
    createAnalyticsRedisKeyParts,
    createSystemOverviewRedisKeyParts,
    readRedisCachedAnalyticsData,
    readRedisCachedSystemOverview,
    setRedisCachedAnalyticsData,
    setRedisCachedSystemOverview,
} from "./redis-cache";
import { ensureCurrentAcademicYearLifecycle } from "@/lib/services/academic-year-lifecycle";

import type { AnalyticsData, SystemAnalyticsOverview } from "./types";
import { handleQueryError } from "@/lib/actions/error-handler";
import {
    querySuccess,
    type QueryResult,
} from "@/lib/actions/query-result";

interface RequestedTerm {
    academicYear?: number;
    semester?: number;
}

/**
 * Runs the lifecycle before any cache key is built or cache is filled, so
 * provisioning (and its Redis invalidation) completes first, and the default
 * view is keyed by the explicit current term: right after rollover it can
 * never be served the previous term's entry.
 */
async function resolveAnalyticsTerm(
    requested: RequestedTerm,
): Promise<RequestedTerm> {
    const currentTerm = await ensureCurrentAcademicYearLifecycle();
    if (requested.academicYear === undefined && requested.semester === undefined) {
        return { academicYear: currentTerm.year, semester: currentTerm.semester };
    }
    return requested;
}

/** The overview shows a single term; without a year it shows the current one. */
async function resolveOverviewTerm(
    requested: RequestedTerm,
): Promise<RequestedTerm> {
    const currentTerm = await ensureCurrentAcademicYearLifecycle();
    if (requested.academicYear === undefined) {
        return { academicYear: currentTerm.year, semester: currentTerm.semester };
    }
    return requested;
}

function buildAnalyticsCacheKey(input: {
    role: string;
    schoolId?: string;
    targetClass: string;
    academicYearStr: string;
    semesterStr: string;
    roundStr: string;
}): string[] {
    return createAnalyticsRedisKeyParts(input);
}

async function getCachedAnalyticsData(
    schoolId: string | undefined,
    targetClass: string,
    role: string,
    academicYearStr: string,
    semesterStr: string,
    roundStr: string,
): Promise<AnalyticsData> {
    const cacheKey = buildAnalyticsCacheKey({
        role,
        schoolId,
        targetClass,
        academicYearStr,
        semesterStr,
        roundStr,
    });
    const redisCached = await readRedisCachedAnalyticsData(cacheKey, schoolId);
    if (redisCached.data) {
        return redisCached.data;
    }

    const cachedFetcher = unstable_cache(
        async () =>
            fetchAnalyticsData(
                schoolId,
                targetClass,
                role,
                academicYearStr,
                semesterStr,
                roundStr,
            ),
        cacheKey,
        { revalidate: 300, tags: getAnalyticsCacheTags(schoolId) },
    );

    const data = await cachedFetcher();
    await setRedisCachedAnalyticsData(
        cacheKey,
        data,
        schoolId,
        redisCached.versionedKeyParts,
    );
    return data;
}

export async function getAnalyticsSummary(
    classFilter?: string,
    schoolFilter?: string,
    academicYear?: number,
    semester?: number,
    assessmentRound?: number,
): Promise<QueryResult<AnalyticsData>> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && viewer.role !== "system_admin") {
            return { status: "not_found" };
        }

        if (viewer.role === "system_admin" && !schoolFilter) {
            return { status: "not_found" };
        }

        let targetClass: string | undefined;
        if (viewer.role === "class_teacher") {
            targetClass = viewer.advisoryClass;
            if (!targetClass) {
                return { status: "not_found" };
            }
        } else {
            targetClass = classFilter;
        }

        const schoolId =
            viewer.role === "system_admin"
                ? schoolFilter
                : viewer.schoolId;

        const term = await resolveAnalyticsTerm({ academicYear, semester });

        return querySuccess(
            await getCachedAnalyticsData(
                schoolId,
                targetClass ?? "",
                viewer.role,
                term.academicYear?.toString() ?? "",
                term.semester?.toString() ?? "",
                assessmentRound?.toString() ?? "",
            ),
        );
    } catch (error) {
        return handleQueryError("Get analytics summary error:", error);
    }
}

export async function getSystemAnalyticsOverview(
    academicYear?: number,
    semester?: number,
): Promise<QueryResult<SystemAnalyticsOverview>> {
    try {
        const viewer = await getViewerContext();
        if (viewer.role !== "system_admin") {
            return { status: "forbidden" };
        }

        const term = await resolveOverviewTerm({ academicYear, semester });
        const overviewCacheKey = createSystemOverviewRedisKeyParts(term);
        const redisCached = await readRedisCachedSystemOverview(overviewCacheKey);
        if (redisCached.data) {
            return querySuccess(redisCached.data);
        }

        const cachedOverviewFetcher = unstable_cache(
            async () =>
                fetchSystemAnalyticsOverview(term.academicYear, term.semester),
            overviewCacheKey,
            { revalidate: 300, tags: [ANALYTICS_OVERVIEW_TAG] },
        );

        const data = await cachedOverviewFetcher();
        await setRedisCachedSystemOverview(
            overviewCacheKey,
            data,
            redisCached.versionedKeyParts,
        );
        return querySuccess(data);
    } catch (error) {
        return handleQueryError("Get system analytics overview error:", error);
    }
}
