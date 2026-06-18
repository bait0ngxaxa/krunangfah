import { getRedisClient } from "@/lib/redis";
import { logError } from "@/lib/utils/logging";
import type { AnalyticsData, SystemAnalyticsOverview } from "./types";
import {
    ANALYTICS_REDIS_GLOBAL_TAG,
    ANALYTICS_REDIS_OVERVIEW_TAG,
    ANALYTICS_REDIS_TTL_SECONDS,
    createCacheKey,
    createSchoolTag,
    createTagVersionKey,
    createUniqueTags,
    createVersionedKeyParts,
} from "./redis-cache-keys";

interface CacheRead<T> {
    data: T | null;
    versionedKeyParts: string[] | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isRiskLevelSummary(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return (
        typeof value.riskLevel === "string" &&
        typeof value.count === "number" &&
        typeof value.label === "string" &&
        typeof value.color === "string" &&
        typeof value.percentage === "number" &&
        typeof value.referralCount === "number"
    );
}

function isTrendDataPoint(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return (
        typeof value.period === "string" &&
        typeof value.academicYear === "number" &&
        typeof value.semester === "number" &&
        typeof value.round === "number" &&
        typeof value.blue === "number" &&
        typeof value.green === "number" &&
        typeof value.yellow === "number" &&
        typeof value.orange === "number" &&
        typeof value.red === "number"
    );
}

function isActivityProgressByRisk(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return (
        typeof value.riskLevel === "string" &&
        typeof value.label === "string" &&
        typeof value.color === "string" &&
        typeof value.totalStudents === "number" &&
        typeof value.noActivity === "number" &&
        typeof value.activity1 === "number" &&
        typeof value.activity2 === "number" &&
        typeof value.activity3 === "number" &&
        typeof value.activity4 === "number" &&
        typeof value.activity5 === "number"
    );
}

function isActivityCompletionSummary(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return (
        typeof value.notStartedStudents === "number" &&
        typeof value.inProgressStudents === "number" &&
        typeof value.completedStudents === "number"
    );
}

function isGradeRiskData(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return (
        typeof value.grade === "string" &&
        typeof value.red === "number" &&
        typeof value.orange === "number" &&
        typeof value.yellow === "number" &&
        typeof value.green === "number" &&
        typeof value.blue === "number" &&
        typeof value.total === "number"
    );
}

function isHospitalReferralByGrade(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return (
        typeof value.grade === "string" &&
        typeof value.referralCount === "number"
    );
}

function isAnalyticsData(value: unknown): value is AnalyticsData {
    if (!isRecord(value)) return false;
    return (
        typeof value.totalStudents === "number" &&
        Array.isArray(value.riskLevelSummary) &&
        value.riskLevelSummary.every(isRiskLevelSummary) &&
        typeof value.studentsWithAssessment === "number" &&
        typeof value.studentsWithoutAssessment === "number" &&
        isStringArray(value.availableClasses) &&
        isNumberArray(value.availableAcademicYears) &&
        isNumberArray(value.availableSemesters) &&
        isNumberArray(value.availableRounds) &&
        (value.currentClass === undefined ||
            typeof value.currentClass === "string") &&
        (value.currentAcademicYear === undefined ||
            typeof value.currentAcademicYear === "number") &&
        (value.currentSemester === undefined ||
            typeof value.currentSemester === "number") &&
        (value.currentRound === undefined ||
            typeof value.currentRound === "number") &&
        Array.isArray(value.trendData) &&
        value.trendData.every(isTrendDataPoint) &&
        Array.isArray(value.activityProgressByRisk) &&
        value.activityProgressByRisk.every(isActivityProgressByRisk) &&
        isActivityCompletionSummary(value.activityCompletionSummary) &&
        Array.isArray(value.gradeRiskData) &&
        value.gradeRiskData.every(isGradeRiskData) &&
        Array.isArray(value.hospitalReferralsByGrade) &&
        value.hospitalReferralsByGrade.every(isHospitalReferralByGrade) &&
        typeof value.totalReferrals === "number"
    );
}

function isSystemAnalyticsOverview(value: unknown): value is SystemAnalyticsOverview {
    if (!isRecord(value)) return false;
    return (
        typeof value.totalSchools === "number" &&
        typeof value.totalStudents === "number" &&
        typeof value.studentsWithAssessment === "number" &&
        typeof value.screeningCoveragePercent === "number" &&
        typeof value.academicYearLabel === "string" &&
        isNumberArray(value.availableAcademicYears) &&
        isNumberArray(value.availableSemesters) &&
        (value.currentAcademicYear === undefined ||
            typeof value.currentAcademicYear === "number") &&
        (value.currentSemester === undefined ||
            typeof value.currentSemester === "number")
    );
}

async function getJsonCache<T>(
    keyParts: string[],
    tags: string[],
    guard: (value: unknown) => value is T,
): Promise<CacheRead<T>> {
    const client = await getRedisClient();
    if (!client) return { data: null, versionedKeyParts: null };

    try {
        const uniqueTags = createUniqueTags(tags);
        const versionedKeyParts = await createVersionedKeyParts(
            client,
            keyParts,
            uniqueTags,
        );
        const cached = await client.get(createCacheKey(versionedKeyParts));
        if (!cached) return { data: null, versionedKeyParts };

        const parsed: unknown = JSON.parse(cached);
        return { data: guard(parsed) ? parsed : null, versionedKeyParts };
    } catch (error) {
        logError("Analytics Redis cache read error:", error);
        return { data: null, versionedKeyParts: null };
    }
}

async function setJsonCache(
    keyParts: string[],
    value: unknown,
    tags: string[],
    versionedKeyParts?: string[] | null,
): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;

    try {
        const uniqueTags = createUniqueTags(tags);
        const effectiveKeyParts =
            versionedKeyParts ??
            (await createVersionedKeyParts(client, keyParts, uniqueTags));
        const cacheKey = createCacheKey(effectiveKeyParts);

        await client.setEx(
            cacheKey,
            ANALYTICS_REDIS_TTL_SECONDS,
            JSON.stringify(value),
        );
        await Promise.all(
            uniqueTags.map(async (tag) => {
                await client.sAdd(tag, cacheKey);
                await client.expire(tag, ANALYTICS_REDIS_TTL_SECONDS);
            }),
        );
    } catch (error) {
        logError("Analytics Redis cache write error:", error);
    }
}

async function invalidateTag(tag: string): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;

    try {
        await client.incr(createTagVersionKey(tag));
        const keys = await client.sMembers(tag);
        if (keys.length > 0) {
            await client.del(keys);
        }
        await client.del(tag);
    } catch (error) {
        logError("Analytics Redis cache invalidate error:", error);
    }
}

export function createAnalyticsRedisKeyParts(input: {
    role: string;
    schoolId?: string;
    targetClass: string;
    academicYearStr: string;
    semesterStr: string;
    roundStr: string;
}): string[] {
    return [
        "analytics-data",
        `role:${input.role}`,
        `school:${input.schoolId ?? "none"}`,
        `class:${input.targetClass || "all"}`,
        `year:${input.academicYearStr || "all"}`,
        `semester:${input.semesterStr || "all"}`,
        `round:${input.roundStr || "all"}`,
    ];
}

export function createSystemOverviewRedisKeyParts(input: {
    academicYear?: number;
    semester?: number;
}): string[] {
    return [
        "analytics-system-overview",
        `year:${input.academicYear ?? "current"}`,
        `semester:${input.semester ?? "current"}`,
    ];
}

export function readRedisCachedAnalyticsData(
    keyParts: string[],
    schoolId?: string,
): Promise<CacheRead<AnalyticsData>> {
    const tags = schoolId ? [createSchoolTag(schoolId)] : [];
    return getJsonCache(keyParts, tags, isAnalyticsData);
}

export async function getRedisCachedAnalyticsData(
    keyParts: string[],
): Promise<AnalyticsData | null> {
    const result = await readRedisCachedAnalyticsData(keyParts);
    return result.data;
}

export function setRedisCachedAnalyticsData(
    keyParts: string[],
    data: AnalyticsData,
    schoolId?: string,
    versionedKeyParts?: string[] | null,
): Promise<void> {
    const tags = schoolId ? [createSchoolTag(schoolId)] : [];
    return setJsonCache(keyParts, data, tags, versionedKeyParts);
}

export function readRedisCachedSystemOverview(
    keyParts: string[],
): Promise<CacheRead<SystemAnalyticsOverview>> {
    return getJsonCache(
        keyParts,
        [ANALYTICS_REDIS_OVERVIEW_TAG],
        isSystemAnalyticsOverview,
    );
}

export async function getRedisCachedSystemOverview(
    keyParts: string[],
): Promise<SystemAnalyticsOverview | null> {
    const result = await readRedisCachedSystemOverview(keyParts);
    return result.data;
}

export function setRedisCachedSystemOverview(
    keyParts: string[],
    data: SystemAnalyticsOverview,
    versionedKeyParts?: string[] | null,
): Promise<void> {
    return setJsonCache(
        keyParts,
        data,
        [ANALYTICS_REDIS_OVERVIEW_TAG],
        versionedKeyParts,
    );
}

export async function revalidateRedisAnalyticsCache(
    schoolId?: string,
): Promise<void> {
    await Promise.all([
        invalidateTag(ANALYTICS_REDIS_GLOBAL_TAG),
        invalidateTag(ANALYTICS_REDIS_OVERVIEW_TAG),
        ...(schoolId ? [invalidateTag(createSchoolTag(schoolId))] : []),
    ]);
}
