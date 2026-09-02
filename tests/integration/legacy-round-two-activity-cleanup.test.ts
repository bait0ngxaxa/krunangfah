import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/database/prisma";
import {
    auditLegacyActivityProgress,
    cleanupLegacyActivityProgress,
} from "@/lib/services/legacy-round-two-activity-cleanup";
import {
    createTestSchool,
    createTestStudent,
    createTestUser,
    getCreatedIds,
} from "./helpers/seed";
import { createMockUsers } from "./helpers/auth-mock";
import { cleanupAll } from "./helpers/cleanup";

const USERS = createMockUsers("legacy-round-two-cleanup");

describe("Integration: legacy Round 2 activity audit and cleanup", () => {
    let testStudentId = "";
    let roundOneActivityId = "";
    let candidateActivityId = "";
    let worksheetActivityId = "";
    let notesActivityId = "";
    let scheduledActivityId = "";
    let assessedActivityId = "";
    let worksheetId = "";
    let systemAdminEventId = "";

    beforeAll(async () => {
        const school = await createTestSchool({
            name: "Legacy Round 2 Cleanup Test School",
        });
        const admin = await createTestUser(USERS.schoolAdmin, school.id);
        const student = await createTestStudent(school.id, {
            studentId: `LEGACY-CLEANUP-${Date.now()}`,
        });
        testStudentId = student.id;
        const academicYear = await prisma.academicYear.create({
            data: {
                year: 10_000 + Number(String(Date.now()).slice(-5)),
                semester: 1,
                startDate: new Date("2026-05-01T00:00:00.000Z"),
                endDate: new Date("2026-10-31T00:00:00.000Z"),
            },
        });
        getCreatedIds().academicYears.push(academicYear.id);

        const roundOnePhq = await prisma.phqResult.create({
            data: {
                studentId: student.id,
                academicYearId: academicYear.id,
                importedById: admin.id,
                assessmentRound: 1,
                q1: 2,
                q2: 2,
                q3: 2,
                q4: 1,
                q5: 1,
                q6: 0,
                q7: 0,
                q8: 0,
                q9: 0,
                totalScore: 10,
                riskLevel: "orange",
            },
        });
        getCreatedIds().phqResults.push(roundOnePhq.id);

        const roundTwoPhq = await prisma.phqResult.create({
            data: {
                studentId: student.id,
                academicYearId: academicYear.id,
                importedById: admin.id,
                assessmentRound: 2,
                q1: 2,
                q2: 2,
                q3: 2,
                q4: 1,
                q5: 1,
                q6: 0,
                q7: 0,
                q8: 0,
                q9: 0,
                totalScore: 10,
                riskLevel: "orange",
            },
        });
        getCreatedIds().phqResults.push(roundTwoPhq.id);

        const initialUnlock = new Date("2026-08-01T00:00:00.000Z");
        const candidate = await prisma.activityProgress.create({
            data: {
                studentId: student.id,
                phqResultId: roundTwoPhq.id,
                activityNumber: 1,
                status: "in_progress",
                unlockedAt: initialUnlock,
            },
        });
        candidateActivityId = candidate.id;
        getCreatedIds().activityProgress.push(candidate.id);

        const worksheetActivity = await prisma.activityProgress.create({
            data: {
                studentId: student.id,
                phqResultId: roundTwoPhq.id,
                activityNumber: 2,
                status: "locked",
            },
        });
        worksheetActivityId = worksheetActivity.id;
        getCreatedIds().activityProgress.push(worksheetActivity.id);
        const worksheet = await prisma.worksheetUpload.create({
            data: {
                activityProgressId: worksheetActivity.id,
                worksheetNumber: 1,
                fileName: "legacy-round-two-test.png",
                fileUrl: `/api/uploads/worksheets/legacy-round-two-${Date.now()}.png`,
                fileType: "image/png",
                fileSize: 128,
                uploadedById: admin.id,
            },
        });
        worksheetId = worksheet.id;

        const notesActivity = await prisma.activityProgress.create({
            data: {
                studentId: student.id,
                phqResultId: roundTwoPhq.id,
                activityNumber: 3,
                status: "locked",
                teacherNotes: "เก็บประวัติการใช้งาน",
            },
        });
        notesActivityId = notesActivity.id;
        getCreatedIds().activityProgress.push(notesActivity.id);

        const scheduledActivity = await prisma.activityProgress.create({
            data: {
                studentId: student.id,
                phqResultId: roundTwoPhq.id,
                activityNumber: 4,
                status: "locked",
                scheduledDate: new Date("2026-09-01T00:00:00.000Z"),
            },
        });
        scheduledActivityId = scheduledActivity.id;
        getCreatedIds().activityProgress.push(scheduledActivity.id);
        const systemAdminEvent = await prisma.systemAdminEvent.create({
            data: {
                targetType: "activityProgress",
                targetId: scheduledActivity.id,
                action: "RESET",
                reason: "legacy audit integration test",
                actorUserId: admin.id,
                actorSnapshot: { id: admin.id },
                targetSnapshot: { id: scheduledActivity.id },
                changes: [],
            },
        });
        systemAdminEventId = systemAdminEvent.id;

        const assessedActivity = await prisma.activityProgress.create({
            data: {
                studentId: student.id,
                phqResultId: roundTwoPhq.id,
                activityNumber: 5,
                status: "completed",
                completedAt: new Date("2026-09-02T00:00:00.000Z"),
                internalProblems: "ปัญหาภายใน",
                externalProblems: "ปัญหาภายนอก",
                problemType: "internal",
                assessedAt: new Date("2026-09-02T00:00:00.000Z"),
            },
        });
        assessedActivityId = assessedActivity.id;
        getCreatedIds().activityProgress.push(assessedActivity.id);

        const roundOneActivity = await prisma.activityProgress.create({
            data: {
                studentId: student.id,
                phqResultId: roundOnePhq.id,
                activityNumber: 1,
                status: "in_progress",
                unlockedAt: initialUnlock,
            },
        });
        roundOneActivityId = roundOneActivity.id;
        getCreatedIds().activityProgress.push(roundOneActivity.id);
    });

    afterAll(async () => {
        if (systemAdminEventId) {
            await prisma.systemAdminEvent
                .delete({ where: { id: systemAdminEventId } })
                .catch(() => {});
        }
        await cleanupAll();
    });

    it("classifies Round 2 records while excluding Round 1", async () => {
        const report = await auditLegacyActivityProgress({
            studentId: testStudentId,
        });

        expect(report).toMatchObject({
            totalLegacyRows: 5,
            roundTwoRows: 5,
            otherNonRoundOneRows: 0,
            cleanupCandidates: 1,
            preservedRows: 4,
        });
        expect(report.records.find((record) => record.id === candidateActivityId)).toMatchObject({
            classification: "cleanup_candidate",
            reasons: ["untouched_auto_generated"],
        });
        expect(report.records.find((record) => record.id === worksheetActivityId)?.reasons).toContain(
            "worksheet_upload",
        );
        expect(report.records.find((record) => record.id === notesActivityId)?.reasons).toContain(
            "teacher_notes",
        );
        expect(report.records.find((record) => record.id === scheduledActivityId)?.reasons).toContain(
            "system_admin_event",
        );
        expect(report.records.find((record) => record.id === assessedActivityId)?.reasons).toContain(
            "completed_at",
        );
        expect(report.records.some((record) => record.id === roundOneActivityId)).toBe(false);
    });

    it("deletes only the untouched candidate and preserves worksheets and historical rows", async () => {
        const result = await cleanupLegacyActivityProgress({
            studentId: testStudentId,
        });

        expect(result.deletedCount).toBe(1);
        expect(result.deletedIds).toEqual([candidateActivityId]);
        expect(result.recheckRejectedCount).toBe(0);
        expect(result.recheckRejectedIds).toEqual([]);
        await expect(
            prisma.activityProgress.findUnique({
                where: { id: candidateActivityId },
            }),
        ).resolves.toBeNull();
        await expect(
            prisma.activityProgress.findUnique({
                where: { id: roundOneActivityId },
            }),
        ).resolves.not.toBeNull();
        await expect(
            prisma.activityProgress.findUnique({
                where: { id: worksheetActivityId },
            }),
        ).resolves.not.toBeNull();
        await expect(
            prisma.worksheetUpload.findUnique({ where: { id: worksheetId } }),
        ).resolves.not.toBeNull();
        await expect(
            prisma.activityProgress.findUnique({
                where: { id: notesActivityId },
            }),
        ).resolves.not.toBeNull();
        await expect(
            prisma.activityProgress.findUnique({
                where: { id: scheduledActivityId },
            }),
        ).resolves.not.toBeNull();
        await expect(
            prisma.activityProgress.findUnique({
                where: { id: assessedActivityId },
            }),
        ).resolves.not.toBeNull();

        const afterCleanup = await auditLegacyActivityProgress({
            studentId: testStudentId,
        });
        expect(afterCleanup.cleanupCandidates).toBe(0);
        expect(afterCleanup.preservedRows).toBe(4);
    });
});
