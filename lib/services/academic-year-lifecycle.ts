import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { revalidateRedisAnalyticsCache } from "@/lib/actions/analytics/redis-cache";
import { acquireRedisLock, releaseRedisLock } from "@/lib/cache/redis-lock";
import {
    forgetTermProvisioned,
    isTermProvisioned,
    markTermProvisioned,
} from "@/lib/services/academic-year-provisioned-marker";
import {
    ensureSchoolClassTermsForAcademicYear,
    hasMissingSchoolClassTermsForAcademicYear,
} from "@/lib/services/school-class-term-service";
import {
    getCurrentAcademicYear,
    type AcademicYearInfo,
} from "@/lib/utils/academic-year";
import { logError, logWarn } from "@/lib/utils/logging";
import type { AcademicYear } from "@/types/teacher.types";

const ACADEMIC_YEAR_LIFECYCLE_LOCK_TTL_SECONDS = 300;
const SCHOOL_PREPARATION_BATCH_SIZE = 10;
const CONTENDED_WAIT_MS = 3_000;
const CONTENDED_POLL_INTERVAL_MS = 250;

const ACADEMIC_YEAR_SELECT = {
    id: true,
    year: true,
    semester: true,
    startDate: true,
    endDate: true,
    isCurrent: true,
    createdAt: true,
    updatedAt: true,
} as const;

// Once per process: Redis is unset in local dev, so a per-request log is noise.
let hasWarnedLockUnavailable = false;

async function prepareCurrentTermForSchools(
    academicYearId: string,
): Promise<void> {
    const schools = await prisma.school.findMany({
        where: { disabledAt: null, isTestData: false },
        select: { id: true },
    });

    for (
        let index = 0;
        index < schools.length;
        index += SCHOOL_PREPARATION_BATCH_SIZE
    ) {
        const schoolBatch = schools.slice(
            index,
            index + SCHOOL_PREPARATION_BATCH_SIZE,
        );

        await Promise.all(
            schoolBatch.map((school) =>
                ensureSchoolClassTermsForAcademicYear(
                    school.id,
                    academicYearId,
                ),
            ),
        );
    }
}

function isSameTerm(
    row: { year: number; semester: number },
    current: AcademicYearInfo,
): boolean {
    return row.year === current.year && row.semester === current.semester;
}

function matchesCurrentTerm(
    row: AcademicYear,
    current: AcademicYearInfo,
): boolean {
    return (
        isSameTerm(row, current) &&
        row.startDate.getTime() === current.startDate.getTime() &&
        row.endDate.getTime() === current.endDate.getTime()
    );
}

async function findCurrentRows(): Promise<AcademicYear[]> {
    // Two rows are enough to tell "exactly one current row" from "more".
    return prisma.academicYear.findMany({
        where: { isCurrent: true },
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        take: 2,
        select: ACADEMIC_YEAR_SELECT,
    });
}

/**
 * The normal request: exactly one current row that equals the clock's term
 * and is known to be provisioned. Read-only; null sends the caller to the
 * slow path.
 */
async function findProvisionedCurrentTerm(
    currentRows: AcademicYear[],
    current: AcademicYearInfo,
): Promise<AcademicYear | null> {
    const [row] = currentRows;
    if (currentRows.length !== 1 || !row || !matchesCurrentTerm(row, current)) {
        return null;
    }

    return (await isTermProvisioned(row)) ? row : null;
}

async function findTermRow(
    currentRows: AcademicYear[],
    current: AcademicYearInfo,
): Promise<AcademicYear | null> {
    const currentRow = currentRows.find((row) => isSameTerm(row, current));
    if (currentRow) return currentRow;

    return prisma.academicYear.findUnique({
        where: {
            year_semester: { year: current.year, semester: current.semester },
        },
        select: ACADEMIC_YEAR_SELECT,
    });
}

function clearOtherCurrentTerms(
    current: AcademicYearInfo,
): Prisma.PrismaPromise<Prisma.BatchPayload> {
    return prisma.academicYear.updateMany({
        where: {
            isCurrent: true,
            NOT: { year: current.year, semester: current.semester },
        },
        data: { isCurrent: false },
    });
}

function writeCurrentTerm(
    current: AcademicYearInfo,
): Prisma.PrismaPromise<AcademicYear> {
    // upsert, not create: a concurrent first request may create the row first.
    return prisma.academicYear.upsert({
        where: {
            year_semester: { year: current.year, semester: current.semester },
        },
        update: {
            startDate: current.startDate,
            endDate: current.endDate,
            isCurrent: true,
        },
        create: { ...current, isCurrent: true },
        select: ACADEMIC_YEAR_SELECT,
    });
}

/**
 * Writes only what differs, so an already-correct row keeps its updatedAt
 * and the steady state takes no row lock.
 */
async function syncCurrentTermRow(
    currentRows: AcademicYear[],
    current: AcademicYearInfo,
): Promise<AcademicYear> {
    const existing = await findTermRow(currentRows, current);
    const clearsOtherTerms = currentRows.some((row) => !isSameTerm(row, current));

    if (existing?.isCurrent && matchesCurrentTerm(existing, current)) {
        if (clearsOtherTerms) await clearOtherCurrentTerms(current);
        return existing;
    }

    if (!clearsOtherTerms) return writeCurrentTerm(current);

    const [, record] = await prisma.$transaction([
        clearOtherCurrentTerms(current),
        writeCurrentTerm(current),
    ]);
    return record;
}

async function provisionUnderLock(record: AcademicYear): Promise<void> {
    const hasMissingTerms = await hasMissingSchoolClassTermsForAcademicYear(
        record.id,
    );

    if (hasMissingTerms) {
        await prepareCurrentTermForSchools(record.id);
        // Redis only: lifecycle runs during render and before cache
        // fills, where Next.js forbids updateTag/revalidateTag/
        // revalidatePath. Analytics callers resolve the current term
        // before building cache keys, so new-term keys never hit a
        // stale Next.js cache entry.
        await revalidateRedisAnalyticsCache();
    }

    await markTermProvisioned(record);
}

function waitFor(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Another request holds the lock and may be provisioning. Waiting briefly
 * lets a rollover request render instead of failing; only the lock holder
 * sets the marker.
 */
async function waitForOtherProvisioner(
    record: AcademicYear,
): Promise<AcademicYear> {
    if (!(await hasMissingSchoolClassTermsForAcademicYear(record.id))) {
        return record;
    }

    const deadline = Date.now() + CONTENDED_WAIT_MS;
    while (Date.now() < deadline) {
        await waitFor(CONTENDED_POLL_INTERVAL_MS);
        if (await isTermProvisioned(record)) return record;
    }

    if (await hasMissingSchoolClassTermsForAcademicYear(record.id)) {
        throw new Error(
            "Academic year school class term provisioning is not complete",
        );
    }

    return record;
}

/**
 * Without the lock nothing may provision (no mutual exclusion), but a term
 * with nothing missing is still correct to serve.
 */
async function serveWithoutLock(
    record: AcademicYear,
    reason: string,
): Promise<AcademicYear> {
    if (await hasMissingSchoolClassTermsForAcademicYear(record.id)) {
        logError("Academic year lifecycle lock unavailable:", new Error(reason));
        throw new Error("Academic year lifecycle lock service is unavailable");
    }

    if (!hasWarnedLockUnavailable) {
        hasWarnedLockUnavailable = true;
        logWarn(
            "Academic year lifecycle lock unavailable; nothing to provision:",
            reason,
        );
    }

    return record;
}

async function runSlowPath(
    currentRows: AcademicYear[],
    current: AcademicYearInfo,
): Promise<AcademicYear> {
    const record = await syncCurrentTermRow(currentRows, current);

    const lockResult = await acquireRedisLock(
        `lock:academic-year-lifecycle:${current.year}:${current.semester}`,
        ACADEMIC_YEAR_LIFECYCLE_LOCK_TTL_SECONDS,
    );

    if (lockResult.status === "acquired") {
        try {
            await provisionUnderLock(record);
        } finally {
            await releaseRedisLock(lockResult.lock);
        }

        return record;
    }

    if (lockResult.status === "contended") {
        return waitForOtherProvisioner(record);
    }

    return serveWithoutLock(record, lockResult.reason);
}

export async function ensureCurrentAcademicYearLifecycle(): Promise<AcademicYear> {
    const current = getCurrentAcademicYear();
    const currentRows = await findCurrentRows();

    const provisioned = await findProvisionedCurrentTerm(currentRows, current);
    if (provisioned) return provisioned;

    return runSlowPath(currentRows, current);
}

/**
 * Call after a school re-enters the provisioning set (restored from disabled,
 * or unmarked as test data). Its classes may have missed a rollover while it
 * was excluded, and the provisioned marker would hide them from the lazy
 * lifecycle until it expires, so provision this school's current-term rows now.
 */
export async function provisionCurrentTermForReactivatedSchool(
    schoolId: string,
): Promise<void> {
    try {
        await ensureSchoolClassTermsForAcademicYear(schoolId);
    } catch (error) {
        logError("Reactivated school term provisioning error:", error);
        // The school change is already committed; let the next lifecycle call retry.
        await forgetTermProvisioned(getCurrentAcademicYear());
    }
}
