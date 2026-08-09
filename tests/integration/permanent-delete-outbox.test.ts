import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/database/prisma";
import {
    createTestAcademicYear,
    createTestActivityProgress,
    createTestPhqResult,
    createTestSchool,
    createTestStudent,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { createMockUsers } from "./helpers/auth-mock";

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

const USERS = createMockUsers("permanent-delete-outbox");
const actor = {
    id: USERS.systemAdmin.id,
    email: USERS.systemAdmin.email,
    name: USERS.systemAdmin.name,
    role: "system_admin",
} as const;
const fileUrls = [
    "/api/uploads/worksheets/permanent-delete-outbox.png",
    "/api/uploads/home-visits/permanent-delete-outbox.png",
];

const { getStudentDataManagementPreview } = await import(
    "@/lib/actions/data-management/preview"
);
const { permanentlyDeleteStudent } = await import(
    "@/lib/actions/data-management/permanent-delete"
);

describe("Integration: permanent-delete file outbox", () => {
    const deletedTargetIds: string[] = [];

    beforeAll(async () => {
        const suffix = Number(String(Date.now()).slice(-5));
        const school = await createTestSchool({
            name: `Permanent Delete Outbox ${suffix}`,
        });
        USERS.schoolAdmin.schoolId = school.id;
        await createTestUser(USERS.schoolAdmin, school.id);
        const academicYear = await createTestAcademicYear({
            year: 9700 + suffix,
            semester: 1,
        });

        const studentWithFiles = await createTestStudent(school.id, {
            studentId: `OUTBOX-FILES-${suffix}`,
        });
        await prisma.student.update({
            where: { id: studentWithFiles.id },
            data: { disabledAt: new Date(), disabledReason: "ข้อมูลผิด" },
        });
        const phq = await createTestPhqResult(
            studentWithFiles.id,
            academicYear.id,
            USERS.schoolAdmin.id,
        );
        const activity = await createTestActivityProgress(
            studentWithFiles.id,
            phq.id,
            1,
            { status: "in_progress" },
        );
        await prisma.worksheetUpload.create({
            data: {
                activityProgressId: activity.id,
                worksheetNumber: 1,
                fileName: "worksheet.png",
                fileUrl: fileUrls[0],
                fileType: "image/png",
                fileSize: 8,
                uploadedById: USERS.schoolAdmin.id,
            },
        });
        const homeVisit = await prisma.homeVisit.create({
            data: {
                studentId: studentWithFiles.id,
                academicYearId: academicYear.id,
                visitNumber: 1,
                visitDate: academicYear.startDate,
                description: "ข้อมูลทดสอบการลบถาวร",
                teacherName: "ครูทดสอบ",
                teacherRole: "ครูประจำชั้น",
                createdById: USERS.schoolAdmin.id,
            },
        });
        await prisma.homeVisitPhoto.create({
            data: {
                homeVisitId: homeVisit.id,
                slot: 1,
                fileName: "home-visit.png",
                fileUrl: fileUrls[1],
                fileType: "image/png",
                fileSize: 8,
            },
        });

        const studentWithoutFiles = await createTestStudent(school.id, {
            studentId: `OUTBOX-NO-FILES-${suffix}`,
        });
        await prisma.student.update({
            where: { id: studentWithoutFiles.id },
            data: { disabledAt: new Date(), disabledReason: "ข้อมูลผิด" },
        });
        deletedTargetIds.push(studentWithFiles.id, studentWithoutFiles.id);
    });

    afterAll(async () => {
        await prisma.dataManagementEvent.deleteMany({
            where: { targetId: { in: deletedTargetIds } },
        });
        await prisma.fileDeletionOutbox.deleteMany({
            where: { fileUrl: { in: fileUrls } },
        });
        await cleanupAll();
    });

    it("commits file cleanup jobs with deletion and keeps retries idempotent", async () => {
        const targetId = deletedTargetIds[0];
        if (!targetId) throw new Error("Missing student-with-files fixture");
        const preview = await getStudentDataManagementPreview(targetId);
        if (!preview) throw new Error("Missing permanent-delete preview");

        const input = {
            id: targetId,
            reason: "ลบข้อมูลผิดถาวร",
            expectedUpdatedAt: preview.updatedAt,
            expectedImpactFingerprint: preview.impactFingerprint,
            actor,
        };
        const firstResult = await permanentlyDeleteStudent(input);

        expect(firstResult).toEqual({
            success: true,
            message: "ลบถาวรนักเรียนสำเร็จ",
        });
        await expect(
            prisma.student.findUnique({ where: { id: targetId } }),
        ).resolves.toBeNull();
        await expect(
            prisma.fileDeletionOutbox.findMany({
                where: { fileUrl: { in: fileUrls } },
                select: {
                    fileUrl: true,
                    attempts: true,
                    processedAt: true,
                    lastError: true,
                },
                orderBy: { fileUrl: "asc" },
            }),
        ).resolves.toEqual(
            [...fileUrls]
                .sort()
                .map((fileUrl) => ({
                    fileUrl,
                    attempts: 0,
                    processedAt: null,
                    lastError: null,
                })),
        );

        const retryResult = await permanentlyDeleteStudent(input);
        expect(retryResult).toEqual({ success: false, message: "ไม่พบนักเรียน" });
        await expect(
            prisma.fileDeletionOutbox.count({
                where: { fileUrl: { in: fileUrls } },
            }),
        ).resolves.toBe(2);
        await expect(
            prisma.dataManagementEvent.count({ where: { targetId } }),
        ).resolves.toBe(1);
    });

    it("permanently deletes a student without files without creating jobs", async () => {
        const targetId = deletedTargetIds[1];
        if (!targetId) throw new Error("Missing student-without-files fixture");
        const outboxCountBefore = await prisma.fileDeletionOutbox.count({
            where: { fileUrl: { in: fileUrls } },
        });
        const preview = await getStudentDataManagementPreview(targetId);
        if (!preview) throw new Error("Missing permanent-delete preview");

        const result = await permanentlyDeleteStudent({
            id: targetId,
            reason: "ลบข้อมูลผิดถาวร",
            expectedUpdatedAt: preview.updatedAt,
            expectedImpactFingerprint: preview.impactFingerprint,
            actor,
        });

        expect(result.success).toBe(true);
        await expect(
            prisma.fileDeletionOutbox.count({
                where: { fileUrl: { in: fileUrls } },
            }),
        ).resolves.toBe(outboxCountBefore);
    });
});
