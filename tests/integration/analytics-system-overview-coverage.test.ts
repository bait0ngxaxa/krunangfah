/**
 * Integration Test: the system overview caps coverage per class across all
 * schools, so a school whose planned count is too low cannot inflate the
 * national figure, and it has no coverage without any planned count.
 *
 * Fixture (synthetic terms far from real ones, so no other suite has term
 * rows or results in them):
 * - TERM (2793/1): school A plans ม.1/1 = 10 and screened 12; school B plans
 *   ม.1/1 = 20 and screened 10. Same class name in both schools.
 * - UNPLANNED_TERM (2793/2): school A screened 3, no school has a term row.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AcademicYear } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { fetchSystemAnalyticsOverview } from "@/lib/actions/analytics/system-overview";
import { createTestAcademicYear, createTestSchool } from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

const YEAR = 2793;
const SCORES_GREEN = { q1: 1, q2: 1, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0 } as const;

let schoolA = "";
let schoolB = "";
let term: AcademicYear;
let unplannedTerm: AcademicYear;

async function createScreenedStudents(
    schoolId: string,
    prefix: string,
    count: number,
    termId: string,
): Promise<void> {
    const students = await prisma.student.createManyAndReturn({
        data: Array.from({ length: count }, (_, index) => ({
            schoolId,
            studentId: `${prefix}-${String(index + 1).padStart(3, "0")}`,
            firstName: "สังเคราะห์",
            lastName: "ภาพรวม",
            class: "ม.1/1",
        })),
        select: { id: true },
    });
    await prisma.phqResult.createMany({
        data: students.map((student) => ({
            studentId: student.id,
            academicYearId: termId,
            assessmentRound: 1,
            className: "ม.1/1",
            ...SCORES_GREEN,
            totalScore: 2,
            riskLevel: "green" as const,
        })),
    });
}

async function planClass(schoolId: string, expected: number): Promise<void> {
    const schoolClass = await prisma.schoolClass.create({
        data: { schoolId, name: "ม.1/1", expectedStudentCount: expected },
    });
    await prisma.schoolClassTerm.create({
        data: { schoolClassId: schoolClass.id, academicYearId: term.id, expectedStudentCount: expected },
    });
}

describe("Integration: system overview coverage capped per class", () => {
    beforeAll(async () => {
        schoolA = (await createTestSchool({ name: "โรงเรียนสังเคราะห์ภาพรวม ก" })).id;
        schoolB = (await createTestSchool({ name: "โรงเรียนสังเคราะห์ภาพรวม ข" })).id;
        term = await createTestAcademicYear({ year: YEAR, semester: 1 });
        unplannedTerm = await createTestAcademicYear({ year: YEAR, semester: 2 });

        await planClass(schoolA, 10);
        await planClass(schoolB, 20);
        await createScreenedStudents(schoolA, "SOA", 12, term.id);
        await createScreenedStudents(schoolB, "SOB", 10, term.id);
        await createScreenedStudents(schoolA, "SOU", 3, unplannedTerm.id);
    });

    afterAll(async () => {
        await prisma.student.deleteMany({ where: { schoolId: { in: [schoolA, schoolB] } } });
        await prisma.schoolClass.deleteMany({ where: { schoolId: { in: [schoolA, schoolB] } } });
        await cleanupAll();
    });

    it("caps the over-counted school's class and counts one school with a mismatch", async () => {
        const overview = await fetchSystemAnalyticsOverview(YEAR, 1);

        // Totals alone would give min(100, 22 / 30) = 73%.
        expect(overview).toMatchObject({
            totalStudents: 30,
            studentsWithAssessment: 22,
            screeningCoveragePercent: 67,
            schoolsWithCountMismatch: 1,
            academicYearLabel: `ปีการศึกษา ${YEAR} เทอม 1`,
        });
    });

    it("has no coverage when no school has a planned count", async () => {
        const overview = await fetchSystemAnalyticsOverview(YEAR, 2);

        expect(overview).toMatchObject({
            totalStudents: 0,
            studentsWithAssessment: 3,
            screeningCoveragePercent: null,
            schoolsWithCountMismatch: 1,
        });
    });
});
