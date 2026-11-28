/**
 * Integration Test: screening coverage is capped per class, then summed, so
 * a class screened above its planned count cannot hide another class's gap.
 *
 * Fixture (synthetic past terms far from real ones; neither is current, so
 * results are attributed to the class at assessment, M3):
 * - TERM (2791/1) planned: ม.1/1 = 30, ม.1/2 = 30.
 *   ม.1/1 has 35 screened students; ม.1/2 has 25, one of them (P) since
 *   promoted to ม.2/2. Ten ม.1/2 students also have a Round 2 result.
 * - NO_ROW_TERM (2791/2) planned: ม.1/1 = 3. Two ม.1/1 students and one in
 *   ม.1/9, a class without a term row.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AcademicYear } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { fetchAnalyticsData } from "@/lib/actions/analytics/data";
import { getCombinedAnalytics } from "@/lib/actions/analytics/queries";
import { createTestAcademicYear, createTestSchool } from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

const YEAR = 2791;
const SCORES_YELLOW = { q1: 2, q2: 2, q3: 2, q4: 1, q5: 1, q6: 1, q7: 1, q8: 0, q9: 0 } as const;

let schoolId = "";
let term: AcademicYear;
let noRowTerm: AcademicYear;

interface ScreenedGroup {
    prefix: string;
    count: number;
    currentClass: string;
    classAtAssessment: string;
    termId: string;
    rounds: number[];
}

async function createScreenedStudents(group: ScreenedGroup): Promise<void> {
    const students = await prisma.student.createManyAndReturn({
        data: Array.from({ length: group.count }, (_, index) => ({
            schoolId,
            studentId: `${group.prefix}-${String(index + 1).padStart(3, "0")}`,
            firstName: "สังเคราะห์",
            lastName: "ครอบคลุม",
            class: group.currentClass,
        })),
        select: { id: true },
    });
    await prisma.phqResult.createMany({
        data: students.flatMap((student) =>
            group.rounds.map((assessmentRound) => ({
                studentId: student.id,
                academicYearId: group.termId,
                assessmentRound,
                className: group.classAtAssessment,
                ...SCORES_YELLOW,
                totalScore: 10,
                riskLevel: "yellow" as const,
            })),
        ),
    });
}

async function createPlannedClass(name: string, plans: Array<{ termId: string; expected: number }>): Promise<void> {
    const schoolClass = await prisma.schoolClass.create({
        data: { schoolId, name, expectedStudentCount: 30 },
    });
    await prisma.schoolClassTerm.createMany({
        data: plans.map((plan) => ({
            schoolClassId: schoolClass.id,
            academicYearId: plan.termId,
            expectedStudentCount: plan.expected,
        })),
    });
}

function analytics(
    selected: AcademicYear,
    options: { role?: string; className?: string; round?: string } = {},
) {
    return fetchAnalyticsData(
        schoolId,
        options.className ?? "",
        options.role ?? "school_admin",
        String(selected.year),
        String(selected.semester),
        options.round ?? "",
    );
}

function coverageOf(data: Awaited<ReturnType<typeof analytics>>) {
    return {
        totalStudents: data.totalStudents,
        studentsWithAssessment: data.studentsWithAssessment,
        screeningCoveragePercent: data.screeningCoveragePercent,
        studentsWithoutAssessment: data.studentsWithoutAssessment,
        coverageCountMismatches: data.coverageCountMismatches,
        coverageUncountedStudents: data.coverageUncountedStudents,
    };
}

describe("Integration: screening coverage capped per class", () => {
    beforeAll(async () => {
        schoolId = (await createTestSchool({ name: "โรงเรียนสังเคราะห์ความครอบคลุม" })).id;
        term = await createTestAcademicYear({ year: YEAR, semester: 1 });
        noRowTerm = await createTestAcademicYear({ year: YEAR, semester: 2 });

        await createPlannedClass("ม.1/1", [
            { termId: term.id, expected: 30 },
            { termId: noRowTerm.id, expected: 3 },
        ]);
        await createPlannedClass("ม.1/2", [{ termId: term.id, expected: 30 }]);

        const inTerm = { termId: term.id, rounds: [1] };
        await createScreenedStudents({ ...inTerm, prefix: "CV11", count: 35, currentClass: "ม.1/1", classAtAssessment: "ม.1/1" });
        await createScreenedStudents({ ...inTerm, prefix: "CV12", count: 14, currentClass: "ม.1/2", classAtAssessment: "ม.1/2" });
        await createScreenedStudents({ ...inTerm, prefix: "CV12R", count: 10, currentClass: "ม.1/2", classAtAssessment: "ม.1/2", rounds: [1, 2] });
        await createScreenedStudents({ ...inTerm, prefix: "CVP", count: 1, currentClass: "ม.2/2", classAtAssessment: "ม.1/2" });

        const inNoRowTerm = { termId: noRowTerm.id, rounds: [1] };
        await createScreenedStudents({ ...inNoRowTerm, prefix: "NR11", count: 2, currentClass: "ม.1/1", classAtAssessment: "ม.1/1" });
        await createScreenedStudents({ ...inNoRowTerm, prefix: "NR19", count: 1, currentClass: "ม.1/9", classAtAssessment: "ม.1/9" });
    });

    afterAll(async () => {
        await prisma.student.deleteMany({ where: { schoolId } });
        await prisma.schoolClass.deleteMany({ where: { schoolId } });
        await cleanupAll();
    });

    it("caps the over-counted class so the under-covered class's gap stays visible", async () => {
        await expect(analytics(term).then(coverageOf)).resolves.toEqual({
            totalStudents: 60,
            studentsWithAssessment: 60,
            screeningCoveragePercent: 92,
            studentsWithoutAssessment: 5,
            coverageCountMismatches: [{ className: "ม.1/1", expected: 30, assessed: 35 }],
            coverageUncountedStudents: 5,
        });
    });

    it("counts the promoted student in the class at assessment time", async () => {
        // Grouped by the current class, P would land in ม.2/2 (no term row) as a second mismatch.
        await expect(analytics(term, { className: "ม.1/2" }).then(coverageOf)).resolves.toEqual({
            totalStudents: 30,
            studentsWithAssessment: 25,
            screeningCoveragePercent: 83,
            studentsWithoutAssessment: 5,
            coverageCountMismatches: [],
            coverageUncountedStudents: 0,
        });
        await expect(analytics(term, { className: "ม.2/2" }).then(coverageOf)).resolves.toMatchObject({
            studentsWithAssessment: 0,
            screeningCoveragePercent: null,
            coverageCountMismatches: [],
        });
    });

    it("keeps a class teacher on the current class: unchanged numbers without a mismatch", async () => {
        // P left ม.1/2 for ม.2/2, so the teacher of ม.1/2 sees 24 of 30, as before.
        await expect(
            analytics(term, { role: "class_teacher", className: "ม.1/2" }).then(coverageOf),
        ).resolves.toEqual({
            totalStudents: 30,
            studentsWithAssessment: 24,
            screeningCoveragePercent: 80,
            studentsWithoutAssessment: 6,
            coverageCountMismatches: [],
            coverageUncountedStudents: 0,
        });
    });

    it("shows a class teacher their own class's mismatch only", async () => {
        await expect(
            analytics(term, { role: "class_teacher", className: "ม.1/1" }).then(coverageOf),
        ).resolves.toEqual({
            totalStudents: 30,
            studentsWithAssessment: 35,
            screeningCoveragePercent: 100,
            studentsWithoutAssessment: 0,
            coverageCountMismatches: [{ className: "ม.1/1", expected: 30, assessed: 35 }],
            coverageUncountedStudents: 5,
        });
    });

    it("counts per class within the selected round", async () => {
        await expect(analytics(term, { round: "2" }).then(coverageOf)).resolves.toEqual({
            totalStudents: 60,
            studentsWithAssessment: 10,
            screeningCoveragePercent: 17,
            studentsWithoutAssessment: 50,
            coverageCountMismatches: [],
            coverageUncountedStudents: 0,
        });
        await expect(analytics(term, { round: "1" }).then(coverageOf)).resolves.toMatchObject({
            studentsWithAssessment: 60,
            screeningCoveragePercent: 92,
            studentsWithoutAssessment: 5,
        });
    });

    it("counts a student whose class has no term row as a mismatch with expected 0", async () => {
        await expect(analytics(noRowTerm).then(coverageOf)).resolves.toEqual({
            totalStudents: 3,
            studentsWithAssessment: 3,
            screeningCoveragePercent: 67,
            studentsWithoutAssessment: 1,
            coverageCountMismatches: [{ className: "ม.1/9", expected: 0, assessed: 1 }],
            coverageUncountedStudents: 1,
        });
    });

    it("per-class assessed counts sum to studentsWithAssessment, including a class without a term row", async () => {
        const scopes = [
            { termId: term.id, classes: {}, round: undefined },
            { termId: term.id, classes: {}, round: 2 },
            { termId: term.id, classes: { classFilter: "ม.1/2" }, round: undefined },
            { termId: term.id, classes: { scopeClass: "ม.1/2" }, round: undefined },
            { termId: noRowTerm.id, classes: {}, round: undefined },
        ];
        for (const scope of scopes) {
            const combined = await getCombinedAnalytics(schoolId, scope.classes, [scope.termId], scope.round, false);
            const distinctStudents = combined.riskLevelCounts.reduce((sum, row) => sum + Number(row.count), 0);
            const perClass = combined.assessedByClass.reduce((sum, row) => sum + row.assessed, 0);

            expect(perClass).toBe(distinctStudents);
        }
        const noRow = await getCombinedAnalytics(schoolId, {}, [noRowTerm.id], undefined, false);
        expect(noRow.assessedByClass).toContainEqual({ schoolId, className: "ม.1/9", assessed: 1 });
    });

    it("keeps coverage null for a multi-term view", async () => {
        const yearWide = await fetchAnalyticsData(schoolId, "", "school_admin", String(YEAR), "", "");

        expect(coverageOf(yearWide)).toEqual({
            totalStudents: null,
            studentsWithAssessment: 63,
            screeningCoveragePercent: null,
            studentsWithoutAssessment: null,
            coverageCountMismatches: [],
            coverageUncountedStudents: 0,
        });
    });
});
