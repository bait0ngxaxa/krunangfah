import type { CachedSessionPayload } from "@/lib/auth/session-cache";

const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;

interface SchoolAccessState {
    role: string;
    school: { disabledAt: Date | null } | null;
}

interface AccountSessionState extends SchoolAccessState {
    deletedAt: Date | null;
}

interface SessionAvailabilityState {
    revokedAt: Date | null;
    expiresAt: Date;
}

export function isSchoolAccessDisabled(user: SchoolAccessState): boolean {
    return Boolean(user.role !== "system_admin" && user.school?.disabledAt);
}

export function isAccountSessionDisabled(user: AccountSessionState): boolean {
    return Boolean(user.deletedAt || isSchoolAccessDisabled(user));
}

export function isSessionUnavailable(
    session: SessionAvailabilityState,
    now: Date,
): boolean {
    return Boolean(session.revokedAt || session.expiresAt <= now);
}

export function hasSessionIdleTimedOut(
    lastActivityAt: Date,
    now: Date,
): boolean {
    return now.getTime() - lastActivityAt.getTime() > IDLE_TIMEOUT_MS;
}

export function getCachedSessionVersion(payload: CachedSessionPayload): number {
    return Number.isFinite(payload.sessionVersion) ? payload.sessionVersion : 0;
}

export function isCachedSessionVersionStale(
    payload: CachedSessionPayload,
    currentVersion: number,
): boolean {
    return currentVersion > 0 && getCachedSessionVersion(payload) < currentVersion;
}

export function hasCachedSessionIdleTimedOut(
    payload: CachedSessionPayload,
    now: Date,
): boolean {
    const lastActivityAt = new Date(payload.lastActivityAt);
    if (Number.isNaN(lastActivityAt.getTime())) return false;
    return hasSessionIdleTimedOut(lastActivityAt, now);
}

export function isCachedSessionValid(
    payload: CachedSessionPayload,
    now: Date,
    currentVersion: number,
): boolean {
    const expiresAt = new Date(payload.expiresAt);
    const lastActivityAt = new Date(payload.lastActivityAt);

    if (payload.revokedAt) return false;
    if (Number.isNaN(expiresAt.getTime())) return false;
    if (Number.isNaN(lastActivityAt.getTime())) return false;
    if (expiresAt <= now) return false;
    if (isCachedSessionVersionStale(payload, currentVersion)) return false;
    return !hasCachedSessionIdleTimedOut(payload, now);
}
