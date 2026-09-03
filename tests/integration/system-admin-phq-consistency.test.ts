import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PhqResult } from "@prisma/client";
import type { Actor } from "@/lib/actions/system-admin/mutations";
import type { SystemPhqEditInput } from "@/lib/validations/system-admin.validation";
import { prisma } from "@/lib/database/prisma";
import {
    createMockUsers,
    mockSession,
    setupAuthMocks,
} from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestPhqResult,
    createTestSchool,
    createTestStudent,
    createTestTeacher,
    createTestUser,
    getCreatedIds,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: vi.fn(),
}));

setupAuthMocks();

const USERS = createMockUsers("system-admin-phq-consistency");
const { initializeActivityProgress } = await import(
    "@/lib/actions/activity/mutations"
);
const { saveSystemPhqResult } = await import(
    "@/lib/actions/system-admin/care-records-admin"
);
const { resetSystemPhqResult } = await import(
    "@/lib/actions/system-admin/care-records-phq-reset"
);

describe("Integration: System Admin PHQ consistency", () => {
    let schoolId = "";
    let academicYearId = "";
    let adminActor: Actor;
    const eventTargetIds: string[] = [];

    beforeAll(async () => {
        const suffix = Number(String(Date.now()).slice(-6));
        const school = await createTestSchool({
            name: "System Admin PHQ Consistency Test School",
        });
        schoolId = school.id;
        USERS.schoolAdmin.schoolId = school.id;
        USERS.classTeacher.schoolId = school.id;

        await Promise.all([
            createTestUser(USERS.systemAdmin),
            createTestUser(USERS.schoolAdmin, school.id),
            createTestUser(USERS.classTeacher, school.id),
        ]);
        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: "ม.1/1",
        });

        const academicYear = await createTestAcademicYear({
            year: 40_000 + suffix,
            semester: 1,
        });
        academicYearId = academicYear.id;
        adminActor = {
            id: USERS.systemAdmin.id,
            email: USERS.systemAdmin.email,
            name: USERS.systemAdmin.name,
            role: "system_admin",
        };
    });

    afterAll(async () => {
        if (eventTargetIds.length > 0) {
            await prisma.systemAdminEvent.deleteMany({
                where: {
                    targetType: "phqResult",
                    targetId: { in: eventTargetIds },
                },
            });
        }
        await cleanupAll();
    });

    it("atomically rebuilds a pristine Round 1 sequence", async () => {
        const student = await createTestStudent(schoolId, {
            studentId: `PHQ-CONSISTENCY-REBUILD-${Date.now()}`,
            class: "ม.1/1",
        });
        const phq = await createTestPhqResult(
            student.id,
            academicYearId,
            USERS.classTeacher.id,
            { riskLevel: "green" },
        );
        eventTargetIds.push(phq.id);

        mockSession(USERS.classTeacher);
        await expect(
            initializeActivityProgress(student.id, phq.id),
        ).resolves.toEqual({ success: true, count: 3 });

        const initialRows = await prisma.activityProgress.findMany({
            where: { phqResultId: phq.id },
            orderBy: { activityNumber: "asc" },
            select: { id: true, activityNumber: true, status: true },
        });
        expect(initialRows.map((row) => row.activityNumber)).toEqual([1, 2, 5]);
        getCreatedIds().activityProgress.push(
            ...initialRows.map((row) => row.id),
        );

        const result = await saveSystemPhqResult(
            createSystemPhqInput(phq, {
                q1: 2,
                q2: 2,
                q3: 2,
                q4: 2,
                q5: 2,
                q6: 2,
                q7: 2,
                q8: 2,
                q9: 2,
                reason: "แก้ไขผลคัดกรองเพื่อทดสอบการปรับชุดกิจกรรม",
            }),
            adminActor,
        );

        expect(result.success).toBe(true);
        const updatedPhq = await prisma.phqResult.findUniqueOrThrow({
            where: { id: phq.id },
            select: { riskLevel: true },
        });
        const rebuiltRows = await prisma.activityProgress.findMany({
            where: { phqResultId: phq.id },
            orderBy: { activityNumber: "asc" },
            select: { id: true, activityNumber: true, status: true, unlockedAt: true },
        });
        expect(updatedPhq.riskLevel).toBe("orange");
        expect(rebuiltRows.map((row) => row.activityNumber)).toEqual([1, 2, 3, 4, 5]);
        expect(rebuiltRows[0]?.status).toBe("in_progress");
        expect(rebuiltRows[0]?.unlockedAt).not.toBeNull();
        expect(rebuiltRows.slice(1).every((row) => row.status === "locked")).toBe(true);
        getCreatedIds().activityProgress.push(
            ...rebuiltRows.map((row) => row.id),
        );

        const event = await prisma.systemAdminEvent.findFirstOrThrow({
            where: { targetType: "phqResult", targetId: phq.id },
            orderBy: { createdAt: "desc" },
            select: { changes: true },
        });
        expect(event.changes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: "activitySequence",
                    before: "1, 2, 5",
                    after: "1, 2, 3, 4, 5",
                }),
            ]),
        );
    });

    it("rejects a risk change after activity history exists", async () => {
        const student = await createTestStudent(schoolId, {
            studentId: `PHQ-CONSISTENCY-HISTORY-${Date.now()}`,
            class: "ม.1/1",
        });
        const phq = await createTestPhqResult(
            student.id,
            academicYearId,
            USERS.classTeacher.id,
            { riskLevel: "green" },
        );
        eventTargetIds.push(phq.id);

        mockSession(USERS.classTeacher);
        await initializeActivityProgress(student.id, phq.id);
        const firstActivity = await prisma.activityProgress.findFirstOrThrow({
            where: { phqResultId: phq.id, activityNumber: 1 },
        });
        getCreatedIds().activityProgress.push(
            ...(await prisma.activityProgress.findMany({
                where: { phqResultId: phq.id },
                select: { id: true },
            })).map((row) => row.id),
        );
        await prisma.activityProgress.update({
            where: { id: firstActivity.id },
            data: { teacherNotes: "ประวัติที่ต้องรักษาไว้" },
        });

        const result = await saveSystemPhqResult(
            createSystemPhqInput(phq, {
                q1: 2,
                q2: 2,
                q3: 2,
                q4: 2,
                q5: 2,
                q6: 2,
                q7: 2,
                q8: 2,
                q9: 2,
                reason: "ทดสอบป้องกันการลบประวัติกิจกรรม",
            }),
            adminActor,
        );

        expect(result).toEqual({
            success: false,
            message: "ไม่สามารถเปลี่ยนระดับความเสี่ยงได้ เนื่องจากมีกิจกรรมที่เริ่มใช้งานแล้ว เพื่อป้องกันข้อมูลกิจกรรมสูญหาย",
        });
        await expect(
            prisma.phqResult.findUniqueOrThrow({
                where: { id: phq.id },
                select: { riskLevel: true },
            }),
        ).resolves.toMatchObject({ riskLevel: "green" });
        await expect(
            prisma.activityProgress.findUniqueOrThrow({
                where: { id: firstActivity.id },
                select: { activityNumber: true, teacherNotes: true },
            }),
        ).resolves.toEqual({
            activityNumber: 1,
            teacherNotes: "ประวัติที่ต้องรักษาไว้",
        });
        await expect(
            prisma.systemAdminEvent.count({
                where: { targetType: "phqResult", targetId: phq.id },
            }),
        ).resolves.toBe(0);
    });

    it("unwinds a same-term PHQ stack from Round 2 before Round 1", async () => {
        const student = await createTestStudent(schoolId, {
            studentId: `PHQ-CONSISTENCY-RESET-${Date.now()}`,
            class: "ม.1/1",
        });
        const roundOne = await createTestPhqResult(
            student.id,
            academicYearId,
            USERS.classTeacher.id,
            { riskLevel: "green" },
        );
        const roundTwo = await createTestPhqResult(
            student.id,
            academicYearId,
            USERS.classTeacher.id,
            { assessmentRound: 2, riskLevel: "green" },
        );
        const blocked = await resetSystemPhqResult(
            {
                id: roundOne.id,
                expectedUpdatedAt: roundOne.updatedAt,
                reason: "ต้องล้างรอบล่าสุดก่อน",
            },
            adminActor,
        );
        expect(blocked).toEqual({
            success: false,
            message: "ล้างผล PHQ ได้เฉพาะผลคัดกรองล่าสุดของนักเรียน",
        });
        await expect(
            prisma.phqResult.count({ where: { id: roundOne.id } }),
        ).resolves.toBe(1);

        const resetRoundTwo = await resetSystemPhqResult(
            {
                id: roundTwo.id,
                expectedUpdatedAt: roundTwo.updatedAt,
                reason: "ล้างผลคัดกรองรอบที่ 2",
            },
            adminActor,
        );
        expect(resetRoundTwo.success).toBe(true);
        await expect(
            prisma.phqResult.count({ where: { id: roundOne.id } }),
        ).resolves.toBe(1);

        const resetRoundOne = await resetSystemPhqResult(
            {
                id: roundOne.id,
                expectedUpdatedAt: roundOne.updatedAt,
                reason: "ล้างผลคัดกรองรอบที่ 1 หลังถอยรอบที่ 2",
            },
            adminActor,
        );
        expect(resetRoundOne.success).toBe(true);
        await expect(
            prisma.phqResult.count({ where: { id: roundOne.id } }),
        ).resolves.toBe(0);
    });
});

function createSystemPhqInput(
    phq: PhqResult,
    overrides: Partial<SystemPhqEditInput> = {},
): SystemPhqEditInput {
    return {
        id: phq.id,
        expectedUpdatedAt: phq.updatedAt,
        q1: phq.q1,
        q2: phq.q2,
        q3: phq.q3,
        q4: phq.q4,
        q5: phq.q5,
        q6: phq.q6,
        q7: phq.q7,
        q8: phq.q8,
        q9: phq.q9,
        q9a: phq.q9a,
        q9b: phq.q9b,
        referredToHospital: phq.referredToHospital,
        hospitalName: phq.hospitalName ?? "",
        reason: "ทดสอบความสอดคล้องของ PHQ",
        ...overrides,
    };
}
