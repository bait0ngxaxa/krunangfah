/**
 * Integration Test: Contiguous Asia/Bangkok academic term boundaries
 *
 * Verifies that care records dated in the formerly uncovered late-October
 * window are accepted, and that the H1 data migration writes exactly the
 * instants produced by the TypeScript term helpers.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
    setupAuthMocks,
    mockSession,
    createMockUsers,
} from "./helpers/auth-mock";
import {
    createTestSchool,
    createTestUser,
    createTestTeacher,
    createTestStudent,
    createTestAcademicYear,
    createTestPhqResult,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/database/prisma";
import {
    bangkokDayStart,
    generateAcademicYearData,
} from "@/lib/utils/academic-year";

setupAuthMocks();

const USERS = createMockUsers("atb");
const TERM_YEAR = 2591;
const MIGRATION_PATH = join(
    process.cwd(),
    "prisma",
    "migrations",
    "20261127000000_contiguous_bangkok_academic_term_ranges",
    "migration.sql",
);

const { createCounselingSession } = await import(
    "@/lib/actions/counseling.actions"
);
const { createHomeVisit } = await import("@/lib/actions/home-visit.actions");

class RollbackSignal extends Error {}

describe("Integration: contiguous Bangkok academic term boundaries", () => {
    let studentId: string;
    let academicYearId: string;
    let octoberTwentieth: Date;

    beforeAll(async () => {
        const [semesterOne] = generateAcademicYearData(TERM_YEAR);
        const school = await createTestSchool();
        const academicYear = await createTestAcademicYear({
            year: semesterOne.year,
            semester: semesterOne.semester,
            startDate: semesterOne.startDate,
            endDate: semesterOne.endDate,
        });
        academicYearId = academicYear.id;
        // 20 Oct, 10:00 Bangkok: previously outside the 15 May - 15 Oct range.
        octoberTwentieth = new Date(
            bangkokDayStart(TERM_YEAR - 543, 9, 20).getTime() + 10 * 60 * 60 * 1000,
        );

        USERS.classTeacher.schoolId = school.id;
        await createTestUser(USERS.classTeacher, school.id);
        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: "ม.4/7",
        });
        const student = await createTestStudent(school.id, { class: "ม.4/7" });
        studentId = student.id;
        await createTestPhqResult(student.id, academicYear.id, USERS.classTeacher.id);
    });

    afterAll(async () => {
        await prisma.counselingSession.deleteMany({ where: { studentId } }).catch(() => {});
        await prisma.homeVisit.deleteMany({ where: { studentId } }).catch(() => {});
        await cleanupAll();
    });

    it("creates a counseling session dated 20 Oct in semester 1", async () => {
        mockSession(USERS.classTeacher);

        const result = await createCounselingSession({
            studentId,
            academicYearId,
            sessionDate: octoberTwentieth,
            counselorName: "ครูทดสอบ",
            summary: "บันทึกปลายเดือนตุลาคม",
        });

        expect(result.success).toBe(true);
        expect(result.session?.academicYearId).toBe(academicYearId);
    });

    it("creates a home visit dated 20 Oct in semester 1", async () => {
        mockSession(USERS.classTeacher);

        const result = await createHomeVisit({
            studentId,
            academicYearId,
            visitDate: octoberTwentieth,
            description: "เยี่ยมบ้านปลายเดือนตุลาคม",
        });

        expect(result.success).toBe(true);
        await expect(
            prisma.homeVisit.count({ where: { studentId, academicYearId } }),
        ).resolves.toBe(1);
    });

    it("migration SQL writes the same instants as the TypeScript helpers", async () => {
        const sql = await readFile(MIGRATION_PATH, "utf8");
        const years = [TERM_YEAR + 1, TERM_YEAR + 2];
        const expected = years.flatMap((year) => generateAcademicYearData(year));
        let observed: Array<{ year: number; semester: number; startDate: Date; endDate: Date }> = [];
        let secondRunTouchedRows = -1;

        // Roll back so the migration never rewrites rows owned by other suites.
        await prisma
            .$transaction(async (tx) => {
                await tx.academicYear.createMany({
                    data: expected.map((term) => ({
                        year: term.year,
                        semester: term.semester,
                        // Legacy day-15 server-local values that the migration must correct.
                        startDate: new Date(Date.UTC(term.year - 543, 4, 15)),
                        endDate: new Date(Date.UTC(term.year - 543, 9, 15)),
                        isCurrent: false,
                    })),
                });
                await tx.$executeRawUnsafe(sql);
                observed = await tx.academicYear.findMany({
                    where: { year: { in: years } },
                    orderBy: [{ year: "asc" }, { semester: "asc" }],
                    select: { year: true, semester: true, startDate: true, endDate: true },
                });
                secondRunTouchedRows = await tx.$executeRawUnsafe(sql);
                throw new RollbackSignal();
            })
            .catch((error: unknown) => {
                if (!(error instanceof RollbackSignal)) throw error;
            });

        expect(observed).toEqual(
            expected.map(({ year, semester, startDate, endDate }) => ({
                year,
                semester,
                startDate,
                endDate,
            })),
        );
        expect(observed[0]?.startDate.toISOString()).toBe("2049-04-30T17:00:00.000Z");
        expect(observed[1]?.endDate.toISOString()).toBe("2050-04-29T17:00:00.000Z");
        expect(secondRunTouchedRows).toBe(0);
        await expect(
            prisma.academicYear.count({ where: { year: { in: years } } }),
        ).resolves.toBe(0);
    });
});
