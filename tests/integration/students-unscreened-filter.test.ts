/**
 * Integration Test: students with no screening result this academic year
 *
 * "This academic year" is the `year` of the current term (both semesters).
 * The filter only finds students; it never changes anyone's status.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { StudentStatus } from "@prisma/client";
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
import type { StudentDashboardQueryOptions } from "@/lib/actions/student/types";

const USERS = createMockUsers("unscreened");
const { getStudentDashboardData } = await import(
    "@/lib/actions/student/dashboard"
);

const OWN_CLASS = "ม.1/1";
const OTHER_CLASS = "ม.1/2";

describe("Integration: unscreened this academic year filter", () => {
    let schoolId = "";
    let previousCurrentIds: string[] = [];
    let currentYear = 0;
    const terms = { lastYear: "", thisYearOther: "", current: "" };
    const ids: Record<string, string> = {};

    async function seed(
        key: string,
        className: string,
        results: Array<[termKey: keyof typeof terms, risk: string]>,
        status?: StudentStatus,
    ): Promise<void> {
        const student = await createTestStudent(schoolId, {
            studentId: `UN-${key}-${Date.now().toString(36).slice(-5)}`,
            class: className,
            firstName: `สังเคราะห์${key}`,
        });
        ids[key] = student.id;
        for (const [termKey, riskLevel] of results) {
            await createTestPhqResult(student.id, terms[termKey], USERS.schoolAdmin.id, {
                riskLevel,
            });
        }
        if (status) {
            await prisma.student.update({ where: { id: student.id }, data: { status } });
        }
    }

    beforeAll(async () => {
        previousCurrentIds = (
            await prisma.academicYear.findMany({
                where: { isCurrent: true },
                select: { id: true },
            })
        ).map((term) => term.id);

        currentYear = 8800 + Number(String(Date.now()).slice(-3));
        terms.lastYear = (await createTestAcademicYear({ year: currentYear - 1, semester: 2 })).id;
        terms.thisYearOther = (await createTestAcademicYear({ year: currentYear, semester: 1 })).id;
        terms.current = (await createTestAcademicYear({ year: currentYear, semester: 2 })).id;
        await prisma.academicYear.updateMany({
            where: { isCurrent: true },
            data: { isCurrent: false },
        });
        await prisma.academicYear.update({
            where: { id: terms.current },
            data: { isCurrent: true },
        });

        schoolId = (await createTestSchool({ name: "โรงเรียนสังเคราะห์ไม่มีผลปีนี้" })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(USERS.classTeacher, schoolId);
        await createTestTeacher(USERS.classTeacher.id, { advisoryClass: OWN_CLASS });

        await seed("lastOnlyRed", OWN_CLASS, [["lastYear", "red"]]);
        await seed("lastOnlyGreen", OWN_CLASS, [["lastYear", "green"]]);
        // Screened in the other semester of this academic year: not unscreened.
        await seed("thisYearOtherTerm", OWN_CLASS, [["thisYearOther", "orange"]]);
        await seed("both", OWN_CLASS, [["lastYear", "red"], ["current", "blue"]]);
        await seed("resigned", OWN_CLASS, [["lastYear", "red"]], "RESIGNED");
        await seed("transferred", OWN_CLASS, [["lastYear", "red"]], "TRANSFERRED");
        await seed("graduated", OWN_CLASS, [["lastYear", "red"]], "GRADUATED");
        await seed("otherClass", OTHER_CLASS, [["lastYear", "yellow"]]);

        const referral = await prisma.studentReferral.create({
            data: {
                studentId: ids.lastOnlyGreen,
                fromTeacherUserId: USERS.classTeacher.id,
                toTeacherUserId: USERS.schoolAdmin.id,
            },
        });
        await prisma.student.update({
            where: { id: ids.lastOnlyGreen },
            data: { activeReferralId: referral.id },
        });
    });

    afterAll(async () => {
        await prisma.studentReferral
            .deleteMany({ where: { studentId: { in: Object.values(ids) } } })
            .catch(() => {});
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

    async function load(options: StudentDashboardQueryOptions) {
        const result = await getStudentDashboardData(options);
        if (result.status !== "success" && result.status !== "empty") {
            throw new Error(`Expected data, received ${result.status}`);
        }
        return result.data;
    }

    function listed(data: Awaited<ReturnType<typeof load>>): string[] {
        return data.students.map((student) => student.id).sort();
    }

    function idsOf(...keys: string[]): string[] {
        return keys.map((key) => ids[key]).sort();
    }

    it("lists exactly the students with results only before this academic year", async () => {
        mockSession(USERS.classTeacher);

        const data = await load({ unscreenedThisYear: true });

        expect(data.unscreenedFilterApplied).toBe(true);
        expect(data.currentAcademicYear).toBe(currentYear);
        expect(listed(data)).toEqual(idsOf("lastOnlyRed", "lastOnlyGreen"));
        expect(data.unscreenedThisYearCount).toBe(2);
        expect(data.totalStudents).toBe(2);
        expect(data.riskCounts.red).toBe(1);
        expect(data.riskCounts.green).toBe(1);
    });

    it("reports the count in the default view without filtering the list", async () => {
        mockSession(USERS.classTeacher);

        const data = await load({});

        expect(data.unscreenedFilterApplied).toBe(false);
        expect(data.unscreenedThisYearCount).toBe(2);
        expect(listed(data)).toEqual(
            idsOf("lastOnlyRed", "lastOnlyGreen", "thisYearOtherTerm", "both"),
        );
    });

    it("combines with risk (latest-ever result) and referred", async () => {
        mockSession(USERS.classTeacher);

        const red = await load({ unscreenedThisYear: true, riskFilter: "red" });
        expect(listed(red)).toEqual(idsOf("lastOnlyRed"));

        const referred = await load({ unscreenedThisYear: true, referredOnly: true });
        expect(listed(referred)).toEqual(idsOf("lastOnlyGreen"));
        expect(referred.referredCount).toBe(1);
    });

    it("never lists or counts excluded statuses or other classes", async () => {
        mockSession(USERS.classTeacher);
        const excluded = ["resigned", "transferred", "graduated", "otherClass"];

        const data = await load({ unscreenedThisYear: true });

        const serialized = JSON.stringify(data);
        for (const key of excluded) {
            expect(serialized).not.toContain(ids[key]);
        }
        expect(data.unscreenedThisYearCount).toBe(2);
    });

    it("counts per school and class filter for a school admin", async () => {
        mockSession(USERS.schoolAdmin);

        const school = await load({ unscreenedThisYear: true });
        expect(school.unscreenedThisYearCount).toBe(3);

        const other = await load({ unscreenedThisYear: true, classFilter: OTHER_CLASS });
        expect(other.unscreenedThisYearCount).toBe(1);
        expect(listed(other)).toEqual(idsOf("otherClass"));

        const own = await load({ unscreenedThisYear: true, classFilter: OWN_CLASS });
        expect(own.unscreenedThisYearCount).toBe(2);
        expect(listed(own)).toEqual(idsOf("lastOnlyRed", "lastOnlyGreen"));
    });

    it("behaves as the selected term only when a term is also given", async () => {
        mockSession(USERS.schoolAdmin);

        const termOnly = await load({ academicYearId: terms.lastYear, classFilter: OWN_CLASS });
        const both = await load({
            academicYearId: terms.lastYear,
            classFilter: OWN_CLASS,
            unscreenedThisYear: true,
        });

        expect(both.unscreenedFilterApplied).toBe(false);
        expect(both.unscreenedThisYearCount).toBe(0);
        expect(listed(both)).toEqual(listed(termOnly));
        expect(both.riskCounts).toEqual(termOnly.riskCounts);
        expect(both.totalStudents).toBe(termOnly.totalStudents);
        expect(both.referredCount).toBe(termOnly.referredCount);
    });

    it("never changes any student's status", async () => {
        const statuses = await prisma.student.findMany({
            where: { id: { in: Object.values(ids) } },
            select: { id: true, status: true },
        });
        const byId = new Map(statuses.map((s) => [s.id, s.status]));

        expect(byId.get(ids.lastOnlyRed)).toBe("ACTIVE");
        expect(byId.get(ids.resigned)).toBe("RESIGNED");
        expect(byId.get(ids.transferred)).toBe("TRANSFERRED");
        expect(byId.get(ids.graduated)).toBe("GRADUATED");
    });
});
