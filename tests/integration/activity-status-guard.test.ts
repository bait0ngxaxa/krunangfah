/**
 * Integration Test: server-side activity status guards
 *
 * Reproduces stale-tab flows: a system admin resets an earlier activity
 * (relocking later ones) or another device completes the activity, while
 * a teacher still has the old activity open.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readdir } from "fs/promises";
import { prisma } from "@/lib/database/prisma";
import {
    createMockUsers,
    mockSession,
    setupAuthMocks,
} from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestActivityProgress,
    createTestPhqResult,
    createTestSchool,
    createTestStudent,
    createTestTeacher,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { UPLOAD_WORKSHEETS_DIR } from "@/lib/constants/uploads";

const redisLockMocks = vi.hoisted(() => ({
    acquireRedisLock: vi.fn(),
    releaseRedisLock: vi.fn(),
}));

vi.mock("@/lib/cache/redis-lock", () => ({
    acquireRedisLock: redisLockMocks.acquireRedisLock,
    releaseRedisLock: redisLockMocks.releaseRedisLock,
}));

redisLockMocks.acquireRedisLock.mockResolvedValue({
    status: "unavailable",
    reason: "client_unavailable",
});
redisLockMocks.releaseRedisLock.mockResolvedValue(undefined);

vi.mock("@/lib/utils/server-image-compression", () => ({
    compressWorksheetImageBuffer: vi.fn(async (buffer: Buffer) => ({
        buffer,
        extension: "png" as const,
        mimeType: "image/png" as const,
    })),
    isSupportedWorksheetImageExtension: vi.fn(() => true),
}));

setupAuthMocks();

const USERS = createMockUsers("asg");

const { uploadWorksheet } = await import("@/lib/actions/activity/file-utils");
const { confirmActivityComplete } = await import("@/lib/actions/activity/mutations");
const { resetSystemAdminActivity } = await import("@/lib/actions/system-admin.actions");

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function createWorksheetFormData(requestId: string): FormData {
    const formData = new FormData();
    formData.set("file", new File([new Uint8Array(PNG_BYTES)], "worksheet.png", { type: "image/png" }));
    formData.set("uploadRequestId", requestId);
    return formData;
}

async function listUploadedFiles(): Promise<Set<string>> {
    return new Set(await readdir(UPLOAD_WORKSHEETS_DIR).catch(() => [] as string[]));
}

async function seedStudentSequence(
    schoolId: string,
    year: number,
    statuses: readonly string[],
): Promise<string[]> {
    const academicYear = await createTestAcademicYear({ year, semester: 1 });
    const student = await createTestStudent(schoolId, { class: "ม.3/4" });
    const phq = await createTestPhqResult(student.id, academicYear.id, USERS.schoolAdmin.id, {
        riskLevel: "orange",
    });
    const ids: string[] = [];
    for (const [index, status] of statuses.entries()) {
        const progress = await createTestActivityProgress(student.id, phq.id, index + 1, { status });
        ids.push(progress.id);
    }
    return ids;
}

async function seedWorksheets(activityProgressId: string, count: number): Promise<void> {
    await prisma.worksheetUpload.createMany({
        data: Array.from({ length: count }, (_, index) => ({
            activityProgressId,
            worksheetNumber: index + 1,
            fileName: `seed-${index + 1}.png`,
            fileUrl: `/api/uploads/worksheets/asg-seed-${activityProgressId}-${index + 1}.png`,
            fileType: "image/png",
            fileSize: 8,
            uploadedById: USERS.schoolAdmin.id,
        })),
    });
}

async function statusesOf(ids: readonly string[]): Promise<string[]> {
    const rows = await prisma.activityProgress.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, status: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row.status]));
    return ids.map((id) => byId.get(id) ?? "missing");
}

describe("Integration: activity status guards", () => {
    let schoolId = "";

    beforeAll(async () => {
        const school = await createTestSchool({ name: "Activity Guard School" });
        schoolId = school.id;
        USERS.schoolAdmin.schoolId = school.id;
        await createTestUser(USERS.systemAdmin, school.id);
        await createTestUser(USERS.schoolAdmin, school.id);
        await createTestTeacher(USERS.schoolAdmin.id, { advisoryClass: "ม.3/4" });
    });

    afterAll(async () => {
        await prisma.systemAdminEvent
            .deleteMany({ where: { actorUserId: USERS.systemAdmin.id } })
            .catch(() => {});
        await cleanupAll();
    });

    it("rejects upload and confirm from a stale tab after an admin reset", async () => {
        const ids = await seedStudentSequence(schoolId, 2588, [
            "completed",
            "completed",
            "in_progress",
            "locked",
            "locked",
        ]);
        const [, activityTwoId, activityThreeId] = ids;
        const activityTwo = await prisma.activityProgress.findUniqueOrThrow({
            where: { id: activityTwoId },
            select: { updatedAt: true },
        });

        mockSession(USERS.systemAdmin);
        const reset = await resetSystemAdminActivity({
            id: activityTwoId,
            expectedUpdatedAt: activityTwo.updatedAt,
            reason: "ทดสอบล้างผลกิจกรรม",
        });
        expect(reset.success).toBe(true);
        await expect(statusesOf(ids)).resolves.toEqual([
            "completed",
            "in_progress",
            "locked",
            "locked",
            "locked",
        ]);

        // The teacher's tab still shows activity 3 as the open activity.
        mockSession(USERS.schoolAdmin);
        const filesBefore = await listUploadedFiles();
        const upload = await uploadWorksheet(
            activityThreeId,
            createWorksheetFormData("00000000-0000-4000-8000-0000000a5301"),
        );

        expect(upload).toMatchObject({
            success: false,
            error: "UPLOAD_ACTIVITY_LOCKED",
            retryable: false,
            refreshRequired: true,
        });
        await expect(
            prisma.worksheetUpload.count({ where: { activityProgressId: activityThreeId } }),
        ).resolves.toBe(0);
        expect(await listUploadedFiles()).toEqual(filesBefore);

        // Even with enough worksheets on record, a locked activity cannot be confirmed.
        await seedWorksheets(activityThreeId, 2);
        const confirm = await confirmActivityComplete(activityThreeId);

        expect(confirm).toEqual({
            success: false,
            error: "กิจกรรมนี้ยังไม่เปิดให้ทำ กรุณารีเฟรชหน้าแล้วลองใหม่",
            refreshRequired: true,
        });
        await expect(statusesOf(ids)).resolves.toEqual([
            "completed",
            "in_progress",
            "locked",
            "locked",
            "locked",
        ]);
        await prisma.worksheetUpload.deleteMany({ where: { activityProgressId: activityThreeId } });
    });

    it("rejects a second device's upload to an already completed activity", async () => {
        const ids = await seedStudentSequence(schoolId, 2587, [
            "completed",
            "completed",
            "in_progress",
            "locked",
            "locked",
        ]);
        const [, activityTwoId, activityThreeId] = ids;
        await seedWorksheets(activityTwoId, 2);

        mockSession(USERS.schoolAdmin);
        const filesBefore = await listUploadedFiles();
        const upload = await uploadWorksheet(
            activityTwoId,
            createWorksheetFormData("00000000-0000-4000-8000-0000000a5302"),
        );

        expect(upload).toMatchObject({
            success: false,
            message: "กิจกรรมนี้ส่งใบงานครบแล้ว กรุณารีเฟรชหน้าแล้วลองใหม่",
            error: "UPLOAD_ACTIVITY_COMPLETED",
        });
        await expect(
            prisma.worksheetUpload.count({ where: { activityProgressId: activityTwoId } }),
        ).resolves.toBe(2);
        await expect(
            prisma.worksheetUpload.count({ where: { activityProgressId: activityThreeId } }),
        ).resolves.toBe(0);
        expect(await listUploadedFiles()).toEqual(filesBefore);
        await prisma.worksheetUpload.deleteMany({ where: { activityProgressId: activityTwoId } });
    });
});
