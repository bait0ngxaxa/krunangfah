import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/database/prisma";
import {
    createMockUsers,
    mockSession,
    setupAuthMocks,
    type MockUser,
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

const USERS = createMockUsers("hospital-referral-hardening");
const { updateHospitalReferral } = await import(
    "@/lib/actions/hospital-referral.actions"
);

describe("Integration: hospital referral server invariants", () => {
    let eligibleLatestPhqId: string;
    let nonEligiblePhqId: string;
    let historicalEligiblePhqId: string;
    let blockedStudentPhqId: string;
    let outsideClassPhqId: string;
    let outsideSchoolPhqId: string;
    let outsideSchoolAdmin: MockUser;

    beforeAll(async () => {
        const [school, otherSchool] = await Promise.all([
            createTestSchool({ name: "Hospital Referral Policy School" }),
            createTestSchool({ name: "Hospital Referral Other School" }),
        ]);
        const suffix = Number(String(Date.now()).slice(-5));
        const [olderTerm, currentTerm] = await Promise.all([
            createTestAcademicYear({ year: 9200 + suffix, semester: 2 }),
            createTestAcademicYear({ year: 9201 + suffix, semester: 1 }),
        ]);

        USERS.classTeacher.schoolId = school.id;
        USERS.schoolAdmin.schoolId = school.id;
        outsideSchoolAdmin = {
            id: `outside-school-admin-${suffix}`,
            name: "Outside School Admin",
            email: `outside-school-admin-${suffix}@test.local`,
            role: "school_admin",
            schoolId: otherSchool.id,
        };

        await Promise.all([
            createTestUser(USERS.classTeacher, school.id),
            createTestUser(USERS.schoolAdmin, school.id),
            createTestUser(outsideSchoolAdmin, otherSchool.id),
        ]);
        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: "ม.1/1",
        });

        const [
            eligibleStudent,
            nonEligibleStudent,
            historicalStudent,
            blockedStudent,
            outsideClassStudent,
            outsideSchoolStudent,
        ] = await Promise.all([
            createTestStudent(school.id, {
                studentId: `HR-ELIGIBLE-${suffix}`,
                class: "ม.1/1",
            }),
            createTestStudent(school.id, {
                studentId: `HR-INELIGIBLE-${suffix}`,
                class: "ม.1/1",
            }),
            createTestStudent(school.id, {
                studentId: `HR-HISTORICAL-${suffix}`,
                class: "ม.1/1",
            }),
            createTestStudent(school.id, {
                studentId: `HR-BLOCKED-${suffix}`,
                class: "ม.1/1",
            }),
            createTestStudent(school.id, {
                studentId: `HR-OUTSIDE-CLASS-${suffix}`,
                class: "ม.2/1",
            }),
            createTestStudent(otherSchool.id, {
                studentId: `HR-OUTSIDE-SCHOOL-${suffix}`,
                class: "ม.1/1",
            }),
        ]);

        const eligibleLatest = await createTestPhqResult(
            eligibleStudent.id,
            currentTerm.id,
            USERS.schoolAdmin.id,
        );
        eligibleLatestPhqId = eligibleLatest.id;
        await makePhqEligibleForHospital(eligibleLatest.id);

        const nonEligible = await createTestPhqResult(
            nonEligibleStudent.id,
            currentTerm.id,
            USERS.schoolAdmin.id,
        );
        nonEligiblePhqId = nonEligible.id;
        await prisma.phqResult.update({
            where: { id: nonEligible.id },
            data: { riskLevel: "red" },
        });

        await createTestPhqResult(
            historicalStudent.id,
            currentTerm.id,
            USERS.schoolAdmin.id,
            { createdAt: new Date("2026-01-01T00:00:00.000Z") },
        );
        const historicalEligible = await createTestPhqResult(
            historicalStudent.id,
            olderTerm.id,
            USERS.schoolAdmin.id,
            { createdAt: new Date("2026-02-01T00:00:00.000Z") },
        );
        historicalEligiblePhqId = historicalEligible.id;
        await makePhqEligibleForHospital(historicalEligible.id);

        const blockedPhq = await createTestPhqResult(
            blockedStudent.id,
            currentTerm.id,
            USERS.schoolAdmin.id,
        );
        blockedStudentPhqId = blockedPhq.id;
        await makePhqEligibleForHospital(blockedPhq.id);
        await prisma.student.update({
            where: { id: blockedStudent.id },
            data: { status: "GRADUATED", statusChangedAt: new Date() },
        });

        const outsideClassPhq = await createTestPhqResult(
            outsideClassStudent.id,
            currentTerm.id,
            USERS.schoolAdmin.id,
        );
        outsideClassPhqId = outsideClassPhq.id;
        await makePhqEligibleForHospital(outsideClassPhq.id);

        const outsideSchoolPhq = await createTestPhqResult(
            outsideSchoolStudent.id,
            currentTerm.id,
            outsideSchoolAdmin.id,
        );
        outsideSchoolPhqId = outsideSchoolPhq.id;
        await makePhqEligibleForHospital(outsideSchoolPhq.id);
    });

    afterAll(async () => {
        await cleanupAll();
    });

    it("allows an eligible latest red PHQ", async () => {
        mockSession(USERS.classTeacher);

        const result = await updateHospitalReferral({
            phqResultId: eligibleLatestPhqId,
            referredToHospital: true,
            hospitalName: "โรงพยาบาลทดสอบ",
        });

        expect(result).toMatchObject({ success: true });
        await expect(
            prisma.phqResult.findUnique({
                where: { id: eligibleLatestPhqId },
                select: { referredToHospital: true, hospitalName: true },
            }),
        ).resolves.toEqual({
            referredToHospital: true,
            hospitalName: "โรงพยาบาลทดสอบ",
        });
    });

    it("rejects referred=true when stored risk is red but scores are not eligible", async () => {
        mockSession(USERS.classTeacher);

        const result = await updateHospitalReferral({
            phqResultId: nonEligiblePhqId,
            referredToHospital: true,
            hospitalName: "โรงพยาบาลทดสอบ",
        });

        expect(result.success).toBe(false);
        await expect(isReferred(nonEligiblePhqId)).resolves.toBe(false);
    });

    it("rejects an academically historical eligible PHQ backfilled later", async () => {
        mockSession(USERS.classTeacher);

        const result = await updateHospitalReferral({
            phqResultId: historicalEligiblePhqId,
            referredToHospital: true,
            hospitalName: "โรงพยาบาลทดสอบ",
        });

        expect(result.success).toBe(false);
        await expect(isReferred(historicalEligiblePhqId)).resolves.toBe(false);
    });

    it("rejects a blocked student lifecycle status", async () => {
        mockSession(USERS.classTeacher);

        const result = await updateHospitalReferral({
            phqResultId: blockedStudentPhqId,
            referredToHospital: true,
            hospitalName: "โรงพยาบาลทดสอบ",
        });

        expect(result.success).toBe(false);
        await expect(isReferred(blockedStudentPhqId)).resolves.toBe(false);
    });

    it("rejects a class teacher outside the student's class", async () => {
        mockSession(USERS.classTeacher);

        const result = await updateHospitalReferral({
            phqResultId: outsideClassPhqId,
            referredToHospital: true,
            hospitalName: "โรงพยาบาลทดสอบ",
        });

        expect(result.success).toBe(false);
        await expect(isReferred(outsideClassPhqId)).resolves.toBe(false);
    });

    it("rejects a school admin outside the student's school", async () => {
        mockSession(outsideSchoolAdmin);

        const result = await updateHospitalReferral({
            phqResultId: eligibleLatestPhqId,
            referredToHospital: false,
        });

        expect(result.success).toBe(false);
        await expect(isReferred(eligibleLatestPhqId)).resolves.toBe(true);
    });

    it("rejects system_admin from the standard unaudited action", async () => {
        mockSession(USERS.systemAdmin);

        const result = await updateHospitalReferral({
            phqResultId: eligibleLatestPhqId,
            referredToHospital: false,
        });

        expect(result.success).toBe(false);
        await expect(isReferred(eligibleLatestPhqId)).resolves.toBe(true);
    });
});

async function makePhqEligibleForHospital(phqResultId: string): Promise<void> {
    await prisma.phqResult.update({
        where: { id: phqResultId },
        data: {
            q1: 3,
            q2: 3,
            q3: 3,
            q4: 3,
            q5: 3,
            q6: 3,
            q7: 3,
            q8: 0,
            q9: 0,
            totalScore: 21,
            riskLevel: "red",
        },
    });
}

async function isReferred(phqResultId: string): Promise<boolean> {
    const row = await prisma.phqResult.findUniqueOrThrow({
        where: { id: phqResultId },
        select: { referredToHospital: true },
    });
    return row.referredToHospital;
}
