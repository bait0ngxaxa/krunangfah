import type * as ImportTermPolicy from "@/lib/services/import-term-policy";

type ImportTermPolicyModule = typeof ImportTermPolicy;

/**
 * Integration suites isolate data with synthetic far-future academic terms.
 * Treat whichever existing term a suite selects as the current academic year,
 * so the real lookup still runs while the clock-based year is bypassed.
 */
export async function treatSelectedTermAsCurrent(
    importOriginal: () => Promise<ImportTermPolicyModule>,
): Promise<ImportTermPolicyModule> {
    const actual = await importOriginal();
    const { prisma } = await import("@/lib/database/prisma");
    return {
        ...actual,
        checkImportTerm: async (academicYearId, currentYear) => {
            if (currentYear !== undefined) {
                return actual.checkImportTerm(academicYearId, currentYear);
            }
            const term = await prisma.academicYear.findUnique({
                where: { id: academicYearId },
                select: { year: true },
            });
            return actual.checkImportTerm(academicYearId, term?.year);
        },
    };
}
