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
import { logError } from "@/lib/utils/logging";
import type { AcademicYear } from "@/types/teacher.types";

const ACADEMIC_YEAR_LIFECYCLE_LOCK_TTL_SECONDS = 300;
const SCHOOL_PREPARATION_BATCH_SIZE = 10;

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

function matchesCurrentTerm(
    row: AcademicYear,
    current: AcademicYearInfo,
): boolean {
    return (
        row.year === current.year &&
        row.semester === current.semester &&
        row.startDate.getTime() === current.startDate.getTime() &&
        row.endDate.getTime() === current.endDate.getTime()
    );
}

/**
 * The normal request: exactly one current row that equals the clock's term
 * and is known to be provisioned. Read-only; null sends the caller to the
 * slow path.
 */
async function findProvisionedCurrentTerm(
    current: AcademicYearInfo,
): Promise<AcademicYear | null> {
    const currentRows = await prisma.academicYear.findMany({
        where: { isCurrent: true },
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        take: 2,
        select: ACADEMIC_YEAR_SELECT,
    });

    const [row] = currentRows;
    if (currentRows.length !== 1 || !row || !matchesCurrentTerm(row, current)) {
        return null;
    }

    return (await isTermProvisioned(row)) ? row : null;
}

async function syncCurrentTermRow(
    current: AcademicYearInfo,
): Promise<AcademicYear> {
    const [, record] = await prisma.$transaction([
        prisma.academicYear.updateMany({
            where: {
                isCurrent: true,
                NOT: { year: current.year, semester: current.semester },
            },
            data: { isCurrent: false },
        }),
        prisma.academicYear.upsert({
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
        }),
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

async function runSlowPath(current: AcademicYearInfo): Promise<AcademicYear> {
    const record = await syncCurrentTermRow(current);

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
        if (await hasMissingSchoolClassTermsForAcademicYear(record.id)) {
            throw new Error(
                "Academic year school class term provisioning is not complete",
            );
        }

        return record;
    }

    logError(
        "Academic year lifecycle lock unavailable:",
        new Error(lockResult.reason),
    );
    throw new Error("Academic year lifecycle lock service is unavailable");
}

export async function ensureCurrentAcademicYearLifecycle(): Promise<AcademicYear> {
    const current = getCurrentAcademicYear();

    const provisioned = await findProvisionedCurrentTerm(current);
    if (provisioned) return provisioned;

    return runSlowPath(current);
}

/**
 * A restored school's classes may have missed a rollover while it was
 * disabled. The provisioned marker would hide them from the lazy lifecycle
 * until it expires, so provision this school's current-term rows now.
 */
export async function provisionCurrentTermForRestoredSchool(
    schoolId: string,
): Promise<void> {
    try {
        await ensureSchoolClassTermsForAcademicYear(schoolId);
    } catch (error) {
        logError("Restored school term provisioning error:", error);
        // The school is already restored; let the next lifecycle call retry.
        await forgetTermProvisioned(getCurrentAcademicYear());
    }
}
