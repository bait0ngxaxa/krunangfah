import { prisma } from "@/lib/database/prisma";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { acquireRedisLock, releaseRedisLock } from "@/lib/cache/redis-lock";
import {
    ensureSchoolClassTermsForAcademicYear,
    hasMissingSchoolClassTermsForAcademicYear,
} from "@/lib/services/school-class-term-service";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";
import type { AcademicYear } from "@/types/teacher.types";

const ACADEMIC_YEAR_LIFECYCLE_LOCK_TTL_SECONDS = 300;
const SCHOOL_PREPARATION_BATCH_SIZE = 10;

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
        }),
    ]);

    const lock = await acquireRedisLock(
        `lock:academic-year-lifecycle:${current.year}:${current.semester}`,
        ACADEMIC_YEAR_LIFECYCLE_LOCK_TTL_SECONDS,
    );

    if (lock) {
        try {
            const hasMissingTerms =
                await hasMissingSchoolClassTermsForAcademicYear(record.id);

            if (hasMissingTerms) {
                await prepareCurrentTermForSchools(record.id);
                await revalidateAnalyticsCache();
            }
        } finally {
            await releaseRedisLock(lock);
        }
    } else if (await hasMissingSchoolClassTermsForAcademicYear(record.id)) {
        throw new Error(
            "Academic year school class term provisioning is not complete",
        );
    }

    return record;
}
