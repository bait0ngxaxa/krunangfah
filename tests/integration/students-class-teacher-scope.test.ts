/**
 * Integration Test: a class teacher never sees another class via `?class=`
 *
 * Two classes in one synthetic school. The class teacher of ม.1/1 asks for
 * ม.1/2 with every filter combination; nothing about ม.1/2 may come back.
 * Admin class filtering must stay unchanged.
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
import type { StudentDashboardQueryOptions } from "@/lib/actions/student/types";

const USERS = createMockUsers("class-scope");
const { getStudentDashboardData } = await import(
    "@/lib/actions/student/dashboard"
);
const { getStudentsForDashboardQuery, getStudentIdsByLatestRiskQuery } = await import(
    "@/lib/actions/student/queries"
);

const { createActiveStudentReferral, revokeActiveStudentReferral } = await import(
    "@/lib/services/student-referral-command"
);
const { deleteSystemReferral, saveSystemReferral } = await import(
    "@/lib/actions/system-admin/care-records-admin"
);

const OWN_CLASS = "ม.1/1";
const OTHER_CLASS = "ม.1/2";

interface SeededStudent {
    id: string;
    studentId: string;
    firstName: string;
}

describe("Integration: class teacher scope on /students", () => {
    let schoolId = "";
    let termId = "";
    const own: SeededStudent[] = [];
    const other: SeededStudent[] = [];

    async function seedStudent(
        className: string,
        label: string,
        riskLevel: string,
    ): Promise<SeededStudent> {
        const suffix = Date.now().toString(36).slice(-6);
        const student = await createTestStudent(schoolId, {
            studentId: `CS-${label}-${suffix}`,
            class: className,
            firstName: `สังเคราะห์${label}`,
        });
        await createTestPhqResult(student.id, termId, USERS.schoolAdmin.id, {
            riskLevel,
            assessmentRound: 1,
        });
        return {
            id: student.id,
            studentId: student.studentId,
            firstName: student.firstName,
        };
    }

    async function referFromTeacher(studentId: string): Promise<void> {
        const referral = await prisma.studentReferral.create({
            data: {
                studentId,
                fromTeacherUserId: USERS.classTeacher.id,
                toTeacherUserId: USERS.schoolAdmin.id,
            },
        });
        await prisma.student.update({
            where: { id: studentId },
            data: { activeReferralId: referral.id },
        });
    }

    beforeAll(async () => {
        const suffix = Number(String(Date.now()).slice(-4));
        schoolId = (await createTestSchool({ name: "โรงเรียนสังเคราะห์ขอบเขตห้อง" })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(USERS.classTeacher, schoolId);
        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: OWN_CLASS,
        });
        termId = (
            await createTestAcademicYear({ year: 8600 + suffix, semester: 1 })
        ).id;

        own.push(await seedStudent(OWN_CLASS, "A1", "red"));
        own.push(await seedStudent(OWN_CLASS, "A2", "green"));
        other.push(await seedStudent(OTHER_CLASS, "B1", "red"));
        other.push(await seedStudent(OTHER_CLASS, "B2", "yellow"));
        // Worst case for `referredOnly`: this teacher referred a student who
        // is not (or is no longer) in their advisory class.
        await referFromTeacher(other[0].id);
        await referFromTeacher(own[0].id);
    });

    afterAll(async () => {
        await prisma.studentReferral
            .deleteMany({ where: { studentId: { in: [...own, ...other].map((s) => s.id) } } })
            .catch(() => {});
        await cleanupAll();
    });

    function expectNoOtherClassData(response: unknown): void {
        const serialized = JSON.stringify(response);
        expect(serialized).not.toContain(OTHER_CLASS);
        for (const student of other) {
            expect(serialized).not.toContain(student.id);
            expect(serialized).not.toContain(student.studentId);
            expect(serialized).not.toContain(student.firstName);
        }
    }

    const otherClassFilterCases: Array<[string, () => StudentDashboardQueryOptions]> = [
        ["class only", () => ({ classFilter: OTHER_CLASS })],
        ["with riskFilter", () => ({ classFilter: OTHER_CLASS, riskFilter: "red" })],
        ["with referredOnly", () => ({ classFilter: OTHER_CLASS, referredOnly: true })],
        [
            "with academic term and round",
            () => ({ classFilter: OTHER_CLASS, academicYearId: termId, assessmentRound: 1 }),
        ],
        [
            "with every filter combined",
            () => ({
                classFilter: OTHER_CLASS,
                riskFilter: "red",
                referredOnly: true,
                academicYearId: termId,
                assessmentRound: 1,
            }),
        ],
    ];

    it.each(otherClassFilterCases)(
        "returns nothing for another class (%s)",
        async (_label, buildOptions) => {
            mockSession(USERS.classTeacher);

            const result = await getStudentDashboardData(buildOptions());

            expect(result.status).toBe("empty");
            if (result.status !== "empty") throw new Error("Expected empty data");
            expect(result.data.students).toEqual([]);
            expect(result.data.totalStudents).toBe(0);
            expect(result.data.filteredStudentCount).toBe(0);
            expect(result.data.referredCount).toBe(0);
            expect(Object.values(result.data.riskCounts)).toEqual([0, 0, 0, 0, 0]);
            expectNoOtherClassData(result);
        },
    );

    it("query helpers keep the advisory class even when the boundary is bypassed", async () => {
        for (const [, buildOptions] of otherClassFilterCases) {
            const options = buildOptions();
            const context = options.academicYearId
                ? { academicYearId: options.academicYearId, assessmentRound: options.assessmentRound, currentPopulationOnly: false }
                : {};
            const latestRiskStudentIds = options.riskFilter
                ? await getStudentIdsByLatestRiskQuery(
                      { schoolId, advisoryClass: OWN_CLASS, userRole: "class_teacher" },
                      options.riskFilter,
                      context,
                  )
                : undefined;
            const response = await getStudentsForDashboardQuery(
                schoolId,
                OWN_CLASS,
                "class_teacher",
                USERS.classTeacher.id,
                {
                    ...options,
                    ...context,
                    latestRiskStudentIds,
                },
            );

            expect(response.students).toEqual([]);
            expect(response.pagination.total).toBe(0);
            expectNoOtherClassData(response);
        }
    });

    it("serves the teacher's own class unchanged, with or without an explicit class", async () => {
        mockSession(USERS.classTeacher);

        const implicit = await getStudentDashboardData({});
        const explicit = await getStudentDashboardData({ classFilter: OWN_CLASS });

        for (const result of [implicit, explicit]) {
            expect(result.status).toBe("success");
            if (result.status !== "success") throw new Error("Expected data");
            expect(result.data.students.map((s) => s.id).sort()).toEqual(
                own.map((s) => s.id).sort(),
            );
            expect(result.data.classes).toEqual([OWN_CLASS]);
            expect(result.data.totalStudents).toBe(2);
            expect(result.data.riskCounts.red).toBe(1);
            expect(result.data.riskCounts.green).toBe(1);
            expect(result.data.referredCount).toBe(1);
            expectNoOtherClassData(result);
        }

        const referred = await getStudentDashboardData({
            classFilter: OWN_CLASS,
            referredOnly: true,
            riskFilter: "red",
        });
        if (referred.status !== "success") throw new Error("Expected data");
        expect(referred.data.students.map((s) => s.id)).toEqual([own[0].id]);
    });

    it.each([
        [OWN_CLASS, () => own, { red: 1, green: 1, yellow: 0 }],
        [OTHER_CLASS, () => other, { red: 1, green: 0, yellow: 1 }],
    ])(
        "lets a school admin filter by %s (regression)",
        async (className, expectedStudents, expectedRisk) => {
            mockSession(USERS.schoolAdmin);

            const result = await getStudentDashboardData({ classFilter: className });

            expect(result.status).toBe("success");
            if (result.status !== "success") throw new Error("Expected data");
            expect(result.data.students.map((s) => s.id).sort()).toEqual(
                expectedStudents().map((s) => s.id).sort(),
            );
            expect(result.data.classes).toEqual([OWN_CLASS, OTHER_CLASS]);
            expect(result.data.totalStudents).toBe(2);
            expect(result.data.riskCounts.red).toBe(expectedRisk.red);
            expect(result.data.riskCounts.green).toBe(expectedRisk.green);
            expect(result.data.riskCounts.yellow).toBe(expectedRisk.yellow);
            expect(result.data.referredCount).toBe(1);

            const redOnly = await getStudentDashboardData({
                classFilter: className,
                riskFilter: "red",
                referredOnly: true,
            });
            if (redOnly.status !== "success") throw new Error("Expected data");
            expect(redOnly.data.students.map((s) => s.id)).toEqual([
                expectedStudents()[0].id,
            ]);
        },
    );

    it("matches filtering the unfiltered latest-result list by risk across class, referral and term scopes", async () => {
        mockSession(USERS.schoolAdmin);
        const olderTerm = await createTestAcademicYear({ year: 2500, semester: 1 });
        await createTestPhqResult(own[0].id, olderTerm.id, USERS.schoolAdmin.id, {
            riskLevel: "blue",
            assessmentRound: 2,
        });

        const cases: StudentDashboardQueryOptions[] = [
            { classFilter: OWN_CLASS },
            { classFilter: OTHER_CLASS, referredOnly: true },
            { classFilter: OWN_CLASS, academicYearId: termId, assessmentRound: 1 },
            { classFilter: OWN_CLASS, academicYearId: olderTerm.id, assessmentRound: 2, referredOnly: true },
        ];
        for (const options of cases) {
            for (const riskFilter of ["red", "blue"] as const) {
                const withoutRisk = await getStudentDashboardData(options);
                const filtered = await getStudentDashboardData({ ...options, riskFilter });
                if (!("data" in withoutRisk) || !("data" in filtered)) {
                    throw new Error("Expected dashboard data");
                }

                const matching = withoutRisk.data.students.filter(
                    (student) => student.phqResults[0]?.riskLevel === riskFilter,
                );
                expect(filtered.data.students.map((student) => student.id)).toEqual(
                    matching.map((student) => student.id),
                );
                expect(filtered.data.filteredStudentCount).toBe(matching.length);
                expect(filtered.data.referredCount).toBe(
                    matching.filter((student) => student.referral !== null).length,
                );
                expect(filtered.data.riskCounts).toEqual(withoutRisk.data.riskCounts);
                expect(filtered.data.classOptions.find((entry) => entry.name === options.classFilter)?.count)
                    .toBe(matching.length);
            }
        }
    });

    it("agrees across chart, count and list after revoke, reactivation and replacement", async () => {
        const studentId = own[1].id;
        await createTestTeacher(USERS.schoolAdmin.id);
        const actor = await createTestUser(USERS.systemAdmin);
        const referral = await createActiveStudentReferral({
            studentId,
            fromTeacherUserId: USERS.classTeacher.id,
            toTeacherUserId: USERS.schoolAdmin.id,
        });
        if (!referral) throw new Error("Expected an active referral");

        async function expectGreenReferral(
            viewer: typeof USERS.classTeacher | typeof USERS.schoolAdmin,
            active: boolean,
        ): Promise<void> {
            mockSession(viewer);
            const result = await getStudentDashboardData({
                classFilter: OWN_CLASS,
                referredOnly: true,
                riskFilter: "green",
            });
            if (!("data" in result)) throw new Error("Expected dashboard data");
            expect(result.data.riskCounts.green).toBe(active ? 1 : 0);
            expect(result.data.referredCount).toBe(active ? 1 : 0);
            expect(result.data.students.map((student) => student.id)).toEqual(
                active ? [studentId] : [],
            );
        }

        await expectGreenReferral(USERS.classTeacher, true);
        expect(await revokeActiveStudentReferral({
            referralId: referral.id,
            revokedById: USERS.classTeacher.id,
        })).toBe(true);
        await expectGreenReferral(USERS.classTeacher, false);
        await expectGreenReferral(USERS.schoolAdmin, false);

        const input = {
            studentId,
            toTeacherUserId: USERS.classTeacher.id,
            reason: "ทดสอบการส่งต่อ",
        };
        const activated = await saveSystemReferral(input, actor);
        if (!activated.success || !activated.updated) throw new Error("Expected system reactivation");
        await expectGreenReferral(USERS.schoolAdmin, true);
        await expectGreenReferral(USERS.classTeacher, false);

        const replaced = await saveSystemReferral({
            ...input,
            toTeacherUserId: USERS.schoolAdmin.id,
            expectedUpdatedAt: new Date(activated.updated.updatedAt),
        }, actor);
        if (!replaced.success || !replaced.updated) throw new Error("Expected system replacement");
        const closed = await prisma.studentReferral.findUniqueOrThrow({
            where: { id: activated.updated.id },
            select: { closedAt: true },
        });
        expect(closed.closedAt).toBeInstanceOf(Date);
        await expectGreenReferral(USERS.schoolAdmin, true);

        const deleted = await deleteSystemReferral({
            id: replaced.updated.id,
            expectedUpdatedAt: new Date(replaced.updated.updatedAt),
            reason: input.reason,
        }, actor);
        expect(deleted.success).toBe(true);
        await expectGreenReferral(USERS.schoolAdmin, false);
    });


    it("validates class names independently of matching results in the selected term and round", async () => {
        await createTestPhqResult(other[0].id, termId, USERS.schoolAdmin.id, {
            riskLevel: "red",
            assessmentRound: 2,
        });
        mockSession(USERS.schoolAdmin);

        const result = await getStudentDashboardData({
            classFilter: OWN_CLASS,
            academicYearId: termId,
            assessmentRound: 2,
        });
        if (result.status !== "empty") throw new Error("Expected filtered empty data");
        expect(result.data.classFilterExists).toBe(true);
        expect(result.data.classes).toEqual([OTHER_CLASS]);
        expect(result.data.students).toEqual([]);
        expect(result.data.filteredStudentCount).toBe(0);
        expect(result.data.totalStudents).toBe(0);

        const unknown = await getStudentDashboardData({ classFilter: "ม.1/99" });
        if (unknown.status !== "empty") throw new Error("Expected unknown class to be empty");
        expect(unknown.data.classFilterExists).toBe(false);
    });

});
