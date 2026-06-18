import { createHash } from "crypto";

export const ANALYTICS_REDIS_TTL_SECONDS = 5 * 60;
export const ANALYTICS_REDIS_GLOBAL_TAG = "analytics:tag:global";
export const ANALYTICS_REDIS_OVERVIEW_TAG = "analytics:tag:overview";

const ANALYTICS_REDIS_KEY_PREFIX = "analytics:cache";
const ANALYTICS_REDIS_TAG_PREFIX = "analytics:tag";
const ANALYTICS_REDIS_TAG_VERSION_PREFIX = "analytics:tag-version";

export interface RedisVersionClient {
    get(key: string): Promise<string | null>;
}

export function createCacheKey(parts: string[]): string {
    const digest = createHash("sha256")
        .update(JSON.stringify(parts))
        .digest("hex");
    return `${ANALYTICS_REDIS_KEY_PREFIX}:${digest}`;
}

export function createSchoolTag(schoolId: string): string {
    return `${ANALYTICS_REDIS_TAG_PREFIX}:school:${schoolId}`;
}

export function createTagVersionKey(tag: string): string {
    return `${ANALYTICS_REDIS_TAG_VERSION_PREFIX}:${tag}`;
}

export function createUniqueTags(tags: string[]): string[] {
    return Array.from(new Set([ANALYTICS_REDIS_GLOBAL_TAG, ...tags]));
}

export async function createVersionedKeyParts(
    client: RedisVersionClient,
    keyParts: string[],
    tags: string[],
): Promise<string[]> {
    const versions = await Promise.all(
        tags.map((tag) => client.get(createTagVersionKey(tag))),
    );
    const versionParts = tags.map((tag, index) => {
        const version = versions.at(index) ?? "0";
        return `version:${tag}:${version}`;
    });
    return [...keyParts, ...versionParts];
}
