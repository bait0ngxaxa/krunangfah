import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PhqResult } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import type { Actor } from "@/lib/actions/system-admin/mutations";
import type { SystemPhqEditInput } from "@/lib/validations/system-admin.validation";
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
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

setupAuthMocks();

const USERS = createMockUsers("latest-phq-policy");
const { getStudentDetailQuery } = await import(
    "@/lib/actions/student/queries"
);
const { updateStudentProfile } = await import(
    "@/lib/actions/student/mutations"
);
const { initializeActivityProgress } = await import(
    "@/lib/actions/activity/mutations"
);
const { saveSystemPhqResult } = await import(
    "@/lib/actions/system-admin/care-records-admin"
);

describe("Integration: canonical latest PHQ policy", () => {
    let schoolId: string;
    let student: Awaited<ReturnType<typeof createTestStudent>>;
    let currentPhqId: string;
    let historicalBackfillPhqId: string;

    const actor: Actor = {
        id: USERS.systemAdmin.id,
        email: USERS.systemAdmin.email,
        name: USERS.systemAdmin.name,
        role: "system_admin",
    };

    beforeAll(async () => {
        const suffix = Number(String(Date.now()).slice(-5));
        const school = await createTestSchool({
            name: "Latest PHQ Policy School",
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

        const [historicalTerm, currentTerm] = await Promise.all([
            createTestAcademicYear({ year: 9400 + suffix, semester: 1 }),
            createTestAcademicYear({ year: 9401 + suffix, semester: 2 }),
        ]);
        student = await createTestStudent(school.id, {
            studentId: `LATEST-PHQ-${suffix}`,
            class: "ม.1/1",
        });

        const currentPhq = await createTestPhqResult(
            student.id,
            currentTerm.id,
            USERS.schoolAdmin.id,
            {
                riskLevel: "yellow",
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
            },
        );
        const historicalBackfill = await createTestPhqResult(
            student.id,
            historicalTerm.id,
            USERS.schoolAdmin.id,
            {
                riskLevel: "yellow",
                createdAt: new Date("2026-02-01T00:00:00.000Z"),
            },
        );
        currentPhqId = currentPhq.id;
        historicalBackfillPhqId = historicalBackfill.id;
    });

    afterAll(async () => {
        await prisma.systemAdminEvent.deleteMany({
            where: {
                targetType: "phqResult",
                targetId: { in: [currentPhqId, historicalBackfillPhqId] },
            },
        });
        await prisma.activityProgress.deleteMany({
            where: { studentId: student.id },
        });
        await cleanupAll();
    });

    it("keeps the current-term PHQ first in student detail after an older backfill", async () => {
        const detail = await getStudentDetailQuery(
            schoolId,
            undefined,
            "school_admin",
            USERS.schoolAdmin.id,
            student.id,
        );

        expect(detail?.phqResults.map((result) => result.id)).toEqual([
            currentPhqId,
            historicalBackfillPhqId,
        ]);
    });

    it("uses academic chronology for the profile editing guard", async () => {
        mockSession(USERS.schoolAdmin);
        const profileInput = {
            studentId: student.studentId,
            nationalId: null,
            firstName: "นักเรียนแก้ไข",
            lastName: student.lastName,
            gender: null,
            age: null,
            class: student.class,
            status: "ACTIVE" as const,
        };

        const historicalResult = await updateStudentProfile(
            student.id,
            profileInput,
            { activePhqResultId: historicalBackfillPhqId },
        );
        const currentResult = await updateStudentProfile(
            student.id,
            profileInput,
            { activePhqResultId: currentPhqId },
        );

        expect(historicalResult.success).toBe(false);
        expect(currentResult.success).toBe(true);
    });

    it("keeps only the academically latest PHQ actionable for activities", async () => {
        mockSession(USERS.classTeacher);

        const historicalResult = await initializeActivityProgress(
            student.id,
            historicalBackfillPhqId,
            "yellow",
        );
        const currentResult = await initializeActivityProgress(
            student.id,
            currentPhqId,
            "yellow",
        );

        expect(historicalResult.success).toBe(false);
        expect(currentResult.success).toBe(true);
        await expect(
            prisma.activityProgress.count({
                where: {
                    studentId: student.id,
                    phqResultId: historicalBackfillPhqId,
                },
            }),
        ).resolves.toBe(0);
    });

    it("keeps System Admin correction on the latest PHQ and writes an audit event", async () => {
        const historicalPhq = await prisma.phqResult.findUniqueOrThrow({
            where: { id: historicalBackfillPhqId },
        });
        const currentPhq = await prisma.phqResult.findUniqueOrThrow({
            where: { id: currentPhqId },
        });

        const historicalResult = await saveSystemPhqResult(
            createSystemPhqInput(historicalPhq),
            actor,
        );
        const currentResult = await saveSystemPhqResult(
            createSystemPhqInput(currentPhq, { q1: 3 }),
            actor,
        );

        expect(historicalResult.success).toBe(false);
        expect(currentResult.success).toBe(true);
        await expect(
            prisma.systemAdminEvent.count({
                where: {
                    targetType: "phqResult",
                    targetId: currentPhqId,
                    action: "EDIT",
                },
            }),
        ).resolves.toBe(1);
        await expect(
            prisma.systemAdminEvent.count({
                where: {
                    targetType: "phqResult",
                    targetId: historicalBackfillPhqId,
                },
            }),
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
        reason: "ยืนยันลำดับผลคัดกรองตามปีการศึกษา",
        ...overrides,
    };
}
