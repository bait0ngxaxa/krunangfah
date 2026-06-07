import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import { logError } from "@/lib/utils/logging";
import type { AnalyticsData, SystemAnalyticsOverview } from "./types";

const ANALYTICS_REDIS_TTL_SECONDS = 5 * 60;
const ANALYTICS_REDIS_KEY_PREFIX = "analytics:cache";
const ANALYTICS_REDIS_TAG_PREFIX = "analytics:tag";
const ANALYTICS_REDIS_GLOBAL_TAG = `${ANALYTICS_REDIS_TAG_PREFIX}:global`;
const ANALYTICS_REDIS_OVERVIEW_TAG = `${ANALYTICS_REDIS_TAG_PREFIX}:overview`;

function createCacheKey(parts: string[]): string {
    const digest = createHash("sha256")
        .update(JSON.stringify(parts))
        .digest("hex");
    return `${ANALYTICS_REDIS_KEY_PREFIX}:${digest}`;
}

function createSchoolTag(schoolId: string): string {
    return `${ANALYTICS_REDIS_TAG_PREFIX}:school:${schoolId}`;
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
        (value.currentClass === undefined ||
            typeof value.currentClass === "string") &&
        (value.currentAcademicYear === undefined ||
            typeof value.currentAcademicYear === "number") &&
        (value.currentSemester === undefined ||
            typeof value.currentSemester === "number") &&
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
    guard: (value: unknown) => value is T,
): Promise<T | null> {
    const client = await getRedisClient();
    if (!client) return null;

    try {
        const cached = await client.get(createCacheKey(keyParts));
        if (!cached) return null;

        const parsed: unknown = JSON.parse(cached);
        return guard(parsed) ? parsed : null;
    } catch (error) {
        logError("Analytics Redis cache read error:", error);
        return null;
    }
}

async function setJsonCache(
    keyParts: string[],
    value: unknown,
    tags: string[],
): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;

    const cacheKey = createCacheKey(keyParts);
    const uniqueTags = Array.from(new Set([ANALYTICS_REDIS_GLOBAL_TAG, ...tags]));

    try {
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
}): string[] {
    return [
        "analytics-data",
        `role:${input.role}`,
        `school:${input.schoolId ?? "none"}`,
        `class:${input.targetClass || "all"}`,
        `year:${input.academicYearStr || "all"}`,
        `semester:${input.semesterStr || "all"}`,
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

export function getRedisCachedAnalyticsData(
    keyParts: string[],
): Promise<AnalyticsData | null> {
    return getJsonCache(keyParts, isAnalyticsData);
}

export function setRedisCachedAnalyticsData(
    keyParts: string[],
    data: AnalyticsData,
    schoolId?: string,
): Promise<void> {
    const tags = schoolId ? [createSchoolTag(schoolId)] : [];
    return setJsonCache(keyParts, data, tags);
}

export function getRedisCachedSystemOverview(
    keyParts: string[],
): Promise<SystemAnalyticsOverview | null> {
    return getJsonCache(keyParts, isSystemAnalyticsOverview);
}

export function setRedisCachedSystemOverview(
    keyParts: string[],
    data: SystemAnalyticsOverview,
): Promise<void> {
    return setJsonCache(keyParts, data, [ANALYTICS_REDIS_OVERVIEW_TAG]);
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
