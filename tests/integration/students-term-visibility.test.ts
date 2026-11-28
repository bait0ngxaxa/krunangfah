/**
 * Integration Test: /students says which term each result is from
 *
 * The default view keeps each student's latest-ever result; the data must
 * carry that result's term, the current term id (read-only) and the terms the
 * viewer can pick, scoped like the list (class teacher → advisory class).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMockUsers, mockSession } from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestPhqResult,
    createTestSchool,
    createTestStudent,
    createTestTeacher,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/database/prisma";

const USERS = createMockUsers("term-visibility");
const { getStudentDashboardData } = await import(
    "@/lib/actions/student/dashboard"
);
const { isNotScreenedThisTerm } = await import(
    "@/lib/utils/student-result-term"
);

const OWN_CLASS = "ม.1/1";
const OTHER_CLASS = "ม.1/2";

describe("Integration: result term visibility on /students", () => {
    let schoolId = "";
    let previousCurrentIds: string[] = [];
    const terms = { previous: "", current: "", otherClassOnly: "" };
    const students = { lastTermOnly: "", screenedNow: "", otherClass: "" };

    beforeAll(async () => {
        previousCurrentIds = (
            await prisma.academicYear.findMany({
                where: { isCurrent: true },
                select: { id: true },
            })
        ).map((term) => term.id);

        const year = 8700 + Number(String(Date.now()).slice(-3));
        terms.previous = (await createTestAcademicYear({ year, semester: 1 })).id;
        terms.current = (await createTestAcademicYear({ year, semester: 2 })).id;
        terms.otherClassOnly = (
            await createTestAcademicYear({ year: year - 1, semester: 2 })
        ).id;
        await prisma.academicYear.updateMany({
            where: { isCurrent: true },
            data: { isCurrent: false },
        });
        await prisma.academicYear.update({
            where: { id: terms.current },
            data: { isCurrent: true },
        });

        schoolId = (await createTestSchool({ name: "โรงเรียนสังเคราะห์เทอมผล" })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(USERS.classTeacher, schoolId);
        await createTestTeacher(USERS.classTeacher.id, { advisoryClass: OWN_CLASS });

        const suffix = Date.now().toString(36).slice(-6);
        const importer = USERS.schoolAdmin.id;
        students.lastTermOnly = (
            await createTestStudent(schoolId, { studentId: `TV-A-${suffix}`, class: OWN_CLASS })
        ).id;
        students.screenedNow = (
            await createTestStudent(schoolId, { studentId: `TV-B-${suffix}`, class: OWN_CLASS })
        ).id;
        students.otherClass = (
            await createTestStudent(schoolId, { studentId: `TV-C-${suffix}`, class: OTHER_CLASS })
        ).id;
        await createTestPhqResult(students.lastTermOnly, terms.previous, importer, {
            riskLevel: "red",
        });
        await createTestPhqResult(students.screenedNow, terms.previous, importer, {
            riskLevel: "orange",
        });
        await createTestPhqResult(students.screenedNow, terms.current, importer, {
            riskLevel: "green",
            assessmentRound: 2,
        });
        await createTestPhqResult(students.otherClass, terms.otherClassOnly, importer, {
            riskLevel: "yellow",
        });
    });

    afterAll(async () => {
        await prisma.academicYear
            .updateMany({
                where: { id: { in: Object.values(terms) } },
                data: { isCurrent: false },
            })
            .catch(() => {});
        if (previousCurrentIds.length > 0) {
            await prisma.academicYear
                .updateMany({
                    where: { id: { in: previousCurrentIds } },
                    data: { isCurrent: true },
                })
                .catch(() => {});
        }
        await cleanupAll();
    });

    it("labels each latest result with its term and flags students not screened this term", async () => {
        mockSession(USERS.classTeacher);

        const result = await getStudentDashboardData({});

        expect(result.status).toBe("success");
        if (result.status !== "success") throw new Error("Expected data");
        expect(result.data.currentAcademicYearId).toBe(terms.current);
        expect(result.data.selectedTerm).toBeNull();
        const byId = new Map(result.data.students.map((s) => [s.id, s]));
        expect([...byId.keys()].sort()).toEqual(
            [students.lastTermOnly, students.screenedNow].sort(),
        );

        const lastTerm = byId.get(students.lastTermOnly)?.phqResults[0];
        expect(lastTerm?.riskLevel).toBe("red");
        expect(lastTerm?.assessmentRound).toBe(1);
        expect(lastTerm?.academicYear).toEqual(
            expect.objectContaining({ id: terms.previous, semester: 1 }),
        );
        expect(
            isNotScreenedThisTerm(lastTerm, result.data.currentAcademicYearId),
        ).toBe(true);

        const now = byId.get(students.screenedNow)?.phqResults[0];
        expect(now?.riskLevel).toBe("green");
        expect(now?.assessmentRound).toBe(2);
        expect(now?.academicYear.id).toBe(terms.current);
        expect(
            isNotScreenedThisTerm(now, result.data.currentAcademicYearId),
        ).toBe(false);
    });

    it("lists only the advisory class's terms for a class teacher", async () => {
        mockSession(USERS.classTeacher);

        const result = await getStudentDashboardData({});
        if (result.status !== "success") throw new Error("Expected data");

        expect(result.data.availableTerms.map((term) => term.id)).toEqual([
            terms.current,
            terms.previous,
        ]);
        expect(result.data.availableTerms[0].rounds).toEqual([2]);
        expect(result.data.availableTerms[1].rounds).toEqual([1]);
    });

    it("lists every term of the school for a school admin, newest first", async () => {
        mockSession(USERS.schoolAdmin);

        const result = await getStudentDashboardData({});
        if (result.status !== "success") throw new Error("Expected data");

        expect(result.data.availableTerms.map((term) => term.id)).toEqual([
            terms.current,
            terms.previous,
            terms.otherClassOnly,
        ]);
    });

    it("keeps latest-within-term semantics and returns the selected term", async () => {
        mockSession(USERS.classTeacher);

        const result = await getStudentDashboardData({
            academicYearId: terms.previous,
        });
        if (result.status !== "success") throw new Error("Expected data");

        expect(result.data.selectedTerm).toEqual(
            expect.objectContaining({ id: terms.previous, semester: 1 }),
        );
        const screenedNow = result.data.students.find(
            (s) => s.id === students.screenedNow,
        );
        // Within the previous term this student's latest result is orange.
        expect(screenedNow?.phqResults[0].riskLevel).toBe("orange");
        expect(screenedNow?.phqResults[0].academicYear.id).toBe(terms.previous);
        expect(result.data.riskCounts.red).toBe(1);
        expect(result.data.riskCounts.orange).toBe(1);
        expect(result.data.riskCounts.green).toBe(0);
    });
});
