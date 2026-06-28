import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/database/prisma";
import { createMockUsers } from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestActivityProgress,
    createTestPhqResult,
    createTestSchool,
    createTestStudent,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import {
    createRoundScopeScenario,
    expectAllRoomScope,
    expectSingleRoomScope,
    readActivityAnalytics,
} from "./helpers/analytics-round-scope";

const { getActivityCompletionSummary } = await import(
    "@/lib/actions/analytics/queries"
);

const USERS = createMockUsers("analytics-activity-completion");

describe("Integration: analytics activity completion summary", () => {
    afterAll(async () => {
        await cleanupAll();
    });

    it("counts only completed activity_progress rows as started activity work", async () => {
        const school = await createTestSchool({
            name: "Analytics Activity Completion School",
        });
        const academicYear = await createTestAcademicYear({
            year: 8100 + Number(String(Date.now()).slice(-3)),
            semester: 1,
        });
        const user = await createTestUser(USERS.schoolAdmin, school.id);

        const pendingOnlyStudent = await createTestStudent(school.id, {
            studentId: `AN-PENDING-${Date.now()}`,
            class: "ม.1/1",
        });
        const partiallyCompletedStudent = await createTestStudent(school.id, {
            studentId: `AN-PARTIAL-${Date.now()}`,
            class: "ม.1/1",
        });
        const completedStudent = await createTestStudent(school.id, {
            studentId: `AN-DONE-${Date.now()}`,
            class: "ม.1/1",
        });

        const pendingPhq = await createTestPhqResult(
            pendingOnlyStudent.id,
            academicYear.id,
            user.id,
            { riskLevel: "yellow" },
        );
        const partialPhq = await createTestPhqResult(
            partiallyCompletedStudent.id,
            academicYear.id,
            user.id,
            { riskLevel: "yellow" },
        );
        const completedPhq = await createTestPhqResult(
            completedStudent.id,
            academicYear.id,
            user.id,
            { riskLevel: "yellow" },
        );

        const pendingProgress = await createTestActivityProgress(
            pendingOnlyStudent.id,
            pendingPhq.id,
            1,
            { status: "pending_assessment" },
        );
        await prisma.worksheetUpload.create({
            data: {
                activityProgressId: pendingProgress.id,
                worksheetNumber: 1,
                fileName: "pending-only.png",
                fileUrl: "/api/uploads/worksheets/pending-only.png",
                fileType: "image/png",
                fileSize: 128,
                uploadedById: user.id,
            },
        });

        await createTestActivityProgress(
            partiallyCompletedStudent.id,
            partialPhq.id,
            1,
            { status: "completed" },
        );

        for (const activityNumber of [1, 2, 3, 5]) {
            await createTestActivityProgress(
                completedStudent.id,
                completedPhq.id,
                activityNumber,
                { status: "completed" },
            );
        }

        const summary = await getActivityCompletionSummary(
            school.id,
            undefined,
            academicYear.year,
            academicYear.semester,
        );

        expect(Number(summary.not_started_students)).toBe(1);
        expect(Number(summary.in_progress_students)).toBe(1);
        expect(Number(summary.completed_students)).toBe(1);
    });

    it("does not mix activity progress from older rounds in all-room and class filters", async () => {
        const scenario = await createRoundScopeScenario();
        const allRoomAnalytics = await readActivityAnalytics(scenario);
        const singleRoomAnalytics = await readActivityAnalytics(
            scenario,
            scenario.focusedClass,
        );

        expectAllRoomScope(allRoomAnalytics);
        expectSingleRoomScope(singleRoomAnalytics);
    });
});
