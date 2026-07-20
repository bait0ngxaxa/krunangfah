import { prisma } from "@/lib/database/prisma";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/services/school-class-term-service";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";
import type { AcademicYear } from "@/types/teacher.types";

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

    await Promise.all(
        schools.map((school) =>
            ensureSchoolClassTermsForAcademicYear(school.id, academicYearId),
        ),
    );
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
        await prepareCurrentTermForSchools(record.id);
        await revalidateAnalyticsCache();
    }

    return record;
}
