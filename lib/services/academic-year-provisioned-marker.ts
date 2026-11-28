import {
    deleteRedisMarker,
    readRedisMarker,
    writeRedisMarker,
} from "@/lib/cache/redis-marker";

// Long enough that steady-state requests stay read-only, short enough that a
// missed provisioning path is retried by the lazy lifecycle within a day.
const PROVISIONED_MARKER_TTL_SECONDS = 24 * 60 * 60;
// Each worker process keeps its own memo; the short expiry bounds how long a
// worker can trust the marker after another process deletes it.
const PROVISIONED_MEMO_TTL_MS = 60 * 1000;

interface TermIdentity {
    year: number;
    semester: number;
}

interface ProvisionedTerm extends TermIdentity {
    id: string;
}

let memo: { termId: string; expiresAt: number } | null = null;

function createMarkerKey(term: TermIdentity): string {
    return `academic-year-lifecycle:provisioned:${term.year}:${term.semester}`;
}

function rememberLocally(termId: string): void {
    memo = { termId, expiresAt: Date.now() + PROVISIONED_MEMO_TTL_MS };
}

function isRememberedLocally(termId: string): boolean {
    return memo !== null && memo.termId === termId && Date.now() < memo.expiresAt;
}

/**
 * True only when provisioning of exactly this term row completed. The marker
 * stores the term id, so a recreated row with the same year/semester (e.g. a
 * reset database) is never mistaken for a provisioned one.
 */
export async function isTermProvisioned(term: ProvisionedTerm): Promise<boolean> {
    if (isRememberedLocally(term.id)) return true;

    const marker = await readRedisMarker(createMarkerKey(term));
    if (marker.status !== "present" || marker.value !== term.id) return false;

    rememberLocally(term.id);
    return true;
}

/** Call only after provisioning finished, or was verified complete, under the lifecycle lock. */
export async function markTermProvisioned(term: ProvisionedTerm): Promise<void> {
    rememberLocally(term.id);
    await writeRedisMarker(
        createMarkerKey(term),
        term.id,
        PROVISIONED_MARKER_TTL_SECONDS,
    );
}

/** Makes the next lifecycle call re-check provisioning instead of trusting the marker. */
export async function forgetTermProvisioned(term: TermIdentity): Promise<void> {
    memo = null;
    await deleteRedisMarker(createMarkerKey(term));
}
