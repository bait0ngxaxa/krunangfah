import { prisma } from "@/lib/database/prisma";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { acquireRedisLock, releaseRedisLock } from "@/lib/cache/redis-lock";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/services/school-class-term-service";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";
import type { AcademicYear } from "@/types/teacher.types";

const ACADEMIC_YEAR_LIFECYCLE_LOCK_TTL_SECONDS = 300;
const SCHOOL_PREPARATION_BATCH_SIZE = 10;

function isSameTerm(
    term: { year: number; semester: number } | null,
    current: { year: number; semester: number },
): boolean {
    return term?.year === current.year && term.semester === current.semester;
}

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

export async function ensureCurrentAcademicYearLifecycle(): Promise<AcademicYear> {
    const current = getCurrentAcademicYear();
    const previousCurrent = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
        orderBy: [{ year: "desc" }, { semester: "desc" }],
        select: { year: true, semester: true },
    });

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
            update: { isCurrent: true },
            create: { ...current, isCurrent: true },
        }),
    ]);

    if (!isSameTerm(previousCurrent, current)) {
        const lock = await acquireRedisLock(
            `lock:academic-year-lifecycle:${current.year}:${current.semester}`,
            ACADEMIC_YEAR_LIFECYCLE_LOCK_TTL_SECONDS,
        );

        if (lock) {
            try {
                await prepareCurrentTermForSchools(record.id);
                await revalidateAnalyticsCache();
            } finally {
                await releaseRedisLock(lock);
            }
        }
    }

    return record;
}
