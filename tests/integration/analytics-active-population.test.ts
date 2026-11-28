import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/database/prisma";
import {
    getCombinedAnalytics,
} from "@/lib/actions/analytics/queries";
import { getExpectedStudentCount } from "@/lib/actions/analytics/data";
import {
    calculateScreeningCoverage,
    mergeClassCoverageCounts,
} from "@/lib/actions/analytics/coverage";
import { getStudentDetailQuery } from "@/lib/actions/student/queries";
import {
    createTestAcademicYear,
    createTestPhqResult,
    createTestSchool,
    createTestStudent,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { createMockUsers } from "./helpers/auth-mock";

const USERS = createMockUsers("analytics-active-population");

describe("Integration: current analytics student population", () => {
    afterAll(async () => {
        await cleanupAll();
    });

    it("keeps 100% coverage when one of ten assessed students transfers", async () => {
        const scenario = await createAnalyticsScenario(10);
        const transferredStudent = scenario.students[0];
        await prisma.$transaction([
            prisma.student.update({
                where: { id: transferredStudent.id },
                data: {
                    status: "TRANSFERRED",
                    statusChangedAt: new Date(),
                    leftAt: new Date(),
                },
            }),
            prisma.schoolClassTerm.update({
                where: { id: scenario.schoolClassTermId },
                data: { expectedStudentCount: 9 },
            }),
            prisma.phqResult.update({
                where: { id: scenario.phqResultIds[0] },
                data: {
                    referredToHospital: true,
                    hospitalName: "โรงพยาบาลทดสอบ",
                },
            }),
        ]);

        const [expectedCount, currentAnalytics, historicalAnalytics, detail] =
            await Promise.all([
                getExpectedStudentCount(
                    scenario.schoolId,
                    scenario.className,
                    [scenario.academicYearId],
                ),
                getCombinedAnalytics(
                    scenario.schoolId,
                    { classFilter: scenario.className },
                    [scenario.academicYearId],
                    undefined,
                    true,
                ),
                getCombinedAnalytics(
                    scenario.schoolId,
                    { classFilter: scenario.className },
                    [scenario.academicYearId],
                    undefined,
                    false,
                ),
                getStudentDetailQuery(
                    scenario.schoolId,
                    undefined,
                    "school_admin",
                    USERS.schoolAdmin.id,
                    transferredStudent.id,
                ),
            ]);

        const currentAssessed = sumRiskCounts(
            currentAnalytics.riskLevelCounts,
        );
        expect(expectedCount).toBe(9);
        expect(currentAssessed).toBe(9);
        expect(expectedCount! - currentAssessed).toBe(0);
        const coverage = calculateScreeningCoverage(
            mergeClassCoverageCounts(
                [
                    {
                        schoolId: scenario.schoolId,
                        className: scenario.className,
                        expected: expectedCount ?? 0,
                    },
                ],
                currentAnalytics.assessedByClass,
            ),
        );
        expect(coverage.coveragePercent).toBe(100);
        expect(coverage.mismatches).toEqual([]);
        expect(sumRiskCounts(historicalAnalytics.riskLevelCounts)).toBe(10);
        expect(sumReferralCounts(currentAnalytics.riskLevelCounts)).toBe(0);
        expect(sumReferralCounts(historicalAnalytics.riskLevelCounts)).toBe(1);
        expect(detail?.id).toBe(transferredStudent.id);
        expect(detail?.phqResults).toHaveLength(1);
    });

    it.each(["RESIGNED", "TRANSFERRED", "GRADUATED"] as const)(
        "excludes %s from current analytics without removing historical PHQ visibility",
        async (status) => {
            const scenario = await createAnalyticsScenario(1);
            const student = scenario.students[0];
            await prisma.student.update({
                where: { id: student.id },
                data: { status, statusChangedAt: new Date(), leftAt: new Date() },
            });

            const [currentAnalytics, historicalAnalytics, detail] =
                await Promise.all([
                    getCombinedAnalytics(
                        scenario.schoolId,
                        { classFilter: scenario.className },
                        [scenario.academicYearId],
                        undefined,
                        true,
                    ),
                    getCombinedAnalytics(
                        scenario.schoolId,
                        { classFilter: scenario.className },
                        [scenario.academicYearId],
                        undefined,
                        false,
                    ),
                    getStudentDetailQuery(
                        scenario.schoolId,
                        undefined,
                        "school_admin",
                        USERS.schoolAdmin.id,
                        student.id,
                    ),
                ]);

            expect(sumRiskCounts(currentAnalytics.riskLevelCounts)).toBe(0);
            expect(sumRiskCounts(historicalAnalytics.riskLevelCounts)).toBe(1);
            expect(detail?.phqResults.map((phq) => phq.id)).toEqual([
                scenario.phqResultIds[0],
            ]);
        },
    );
});

async function createAnalyticsScenario(studentCount: number): Promise<{
    schoolId: string;
    academicYearId: string;
    className: string;
    schoolClassTermId: string;
    students: Array<{ id: string }>;
    phqResultIds: string[];
}> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const className = "ม.1/1";
    const school = await createTestSchool({
        name: `Analytics Active Population ${suffix}`,
    });
    const academicYear = await createTestAcademicYear({
        year: 10000 + Number(String(Date.now()).slice(-5)),
        semester: Math.random() > 0.5 ? 1 : 2,
    });
    USERS.schoolAdmin.schoolId = school.id;
    await createTestUser(USERS.schoolAdmin, school.id);
    const schoolClass = await prisma.schoolClass.create({
        data: {
            schoolId: school.id,
            name: className,
            expectedStudentCount: studentCount,
        },
    });
    const schoolClassTerm = await prisma.schoolClassTerm.create({
        data: {
            schoolClassId: schoolClass.id,
            academicYearId: academicYear.id,
            expectedStudentCount: studentCount,
        },
    });

    const students: Array<{ id: string }> = [];
    const phqResultIds: string[] = [];
    for (let index = 0; index < studentCount; index++) {
        const student = await createTestStudent(school.id, {
            studentId: `AAP-${suffix}-${index}`,
            class: className,
        });
        const phq = await createTestPhqResult(
            student.id,
            academicYear.id,
            USERS.schoolAdmin.id,
        );
        students.push({ id: student.id });
        phqResultIds.push(phq.id);
    }

    return {
        schoolId: school.id,
        academicYearId: academicYear.id,
        className,
        schoolClassTermId: schoolClassTerm.id,
        students,
        phqResultIds,
    };
}

function sumRiskCounts(rows: Array<{ count: bigint }>): number {
    return rows.reduce((sum, row) => sum + Number(row.count), 0);
}

function sumReferralCounts(rows: Array<{ referral_count: bigint }>): number {
    return rows.reduce(
        (sum, row) => sum + Number(row.referral_count),
        0,
    );
}
