/**
 * Integration Test: Home Visit
 *
 * Tests visit number auto-increment and academic year filtering fallback
 * using real Prisma + mocked auth.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { unlink } from "fs/promises";
import { basename, join } from "path";
import {
    setupAuthMocks,
    mockSession,
    createMockUsers,
} from "./helpers/auth-mock";
import {
    createTestSchool,
    createTestUser,
    createTestTeacher,
    createTestStudent,
    createTestAcademicYear,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/database/prisma";
import type { QueryResult } from "@/lib/actions/query-result";

vi.mock("@/lib/cache/redis", () => ({
    getRedisClient: vi.fn(async () => null),
}));

vi.mock("@/lib/utils/server-image-compression", () => ({
    compressWorksheetImageBuffer: vi.fn(async (buffer: Buffer) => ({
        buffer,
        extension: "png" as const,
        mimeType: "image/png" as const,
    })),
    isSupportedWorksheetImageExtension: vi.fn(() => true),
}));

function getQueryData<T>(result: QueryResult<T>): T {
    if (result.status === "success" || result.status === "empty") return result.data;
    throw new Error(`Expected query data, received ${result.status}`);
}

setupAuthMocks();

const USERS = createMockUsers("hv");

const { createHomeVisit, getHomeVisits } =
    await import("@/lib/actions/home-visit.actions");
const { uploadHomeVisitPhoto } =
    await import("@/lib/actions/home-visit-photo.actions");

describe("Integration: Home Visits", () => {
    let studentId: string;
    let academicYearId: string;

    beforeAll(async () => {
        const school = await createTestSchool();
        const academicYear = await createTestAcademicYear({
            year: 2597,
            semester: 1,
        });
        academicYearId = academicYear.id;

        USERS.classTeacher.schoolId = school.id;

        await createTestUser(USERS.classTeacher, school.id);
        await createTestTeacher(USERS.classTeacher.id, {
            advisoryClass: "ม.2/6",
        });

        const student = await createTestStudent(school.id, { class: "ม.2/6" });
        studentId = student.id;
    });

    afterAll(async () => {
        const photos = await prisma.homeVisitPhoto.findMany({
            where: { homeVisit: { studentId } },
            select: { fileUrl: true },
        });
        await Promise.all(
            photos.map((photo) =>
                unlink(
                    join(
                        process.cwd(),
                        ".data",
                        "uploads",
                        "home-visits",
                        basename(photo.fileUrl),
                    ),
                ).catch(() => {}),
            ),
        );
        await prisma.homeVisit.deleteMany({ where: { studentId } }).catch(() => {});
        await cleanupAll();
    });

    it("should create visit with incrementing visitNumber and academicYearId", async () => {
        mockSession(USERS.classTeacher);

        const first = await createHomeVisit({
            studentId,
            academicYearId,
            visitDate: new Date("2026-06-10"),
            description: "เยี่ยมบ้านครั้งที่ 1",
        });
        expect(first.success).toBe(true);

        const second = await createHomeVisit({
            studentId,
            academicYearId,
            visitDate: new Date("2026-06-11"),
            description: "เยี่ยมบ้านครั้งที่ 2",
        });
        expect(second.success).toBe(true);

        const allVisits = await prisma.homeVisit.findMany({
            where: { studentId },
            orderBy: { visitNumber: "asc" },
            select: { visitNumber: true, academicYearId: true },
        });
        expect(allVisits[0]?.visitNumber).toBe(1);
        expect(allVisits[1]?.visitNumber).toBe(2);
        expect(allVisits[0]?.academicYearId).toBe(academicYearId);
        expect(allVisits[1]?.academicYearId).toBe(academicYearId);
    });

    it("should not reuse the latest soft-deleted visit number", async () => {
        mockSession(USERS.classTeacher);
        await prisma.homeVisit.updateMany({
            where: { studentId, visitNumber: 2 },
            data: { deletedAt: new Date() },
        });

        const result = await createHomeVisit({
            studentId,
            academicYearId,
            visitDate: new Date("2026-06-12"),
            description: "Visit after soft delete",
        });

        expect(result.success).toBe(true);
        const createdVisit = await prisma.homeVisit.findUnique({
            where: {
                studentId_visitNumber: { studentId, visitNumber: 3 },
            },
            select: { visitNumber: true },
        });
        expect(createdVisit?.visitNumber).toBe(3);
    });

    it("should include legacy visits without academicYearId via date-range fallback", async () => {
        mockSession(USERS.classTeacher);

        await prisma.homeVisit.create({
            data: {
                studentId,
                visitNumber: 999,
                visitDate: new Date("2026-06-20"),
                description: "legacy home visit",
                teacherName: "ครู legacy",
                teacherRole: "ครูประจำชั้น",
                createdById: USERS.classTeacher.id,
            },
        });

        const result = getQueryData(
            await getHomeVisits(studentId, {
                academicYearId,
                dateRange: {
                    startDate: new Date("2026-06-01"),
                    endDate: new Date("2026-06-30"),
                },
            }),
        );

        expect(result.visits.some((visit) => visit.visitNumber === 999)).toBe(
            true,
        );
    });

    it("keeps concurrent photo uploads within five slots when Redis is unavailable", async () => {
        const visit = await prisma.homeVisit.create({
            data: {
                studentId,
                academicYearId,
                visitNumber: 1000,
                visitDate: new Date("2026-06-21"),
                description: "การเยี่ยมบ้านสำหรับทดสอบอัปโหลดรูปภาพพร้อมกัน",
                teacherName: "ครูทดสอบ",
                teacherRole: "ครูประจำชั้น",
                createdById: USERS.classTeacher.id,
            },
        });

        mockSession(USERS.classTeacher);
        const dateNow = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
        try {
            const results = await Promise.all(
                Array.from({ length: 10 }, (_, index) =>
                    uploadHomeVisitPhoto(
                        visit.id,
                        createHomeVisitPhotoFormData(index),
                    ),
                ),
            );
            const photos = await prisma.homeVisitPhoto.findMany({
                where: { homeVisitId: visit.id },
                select: { slot: true, fileUrl: true },
            });
            const successfulResults = results.filter((result) => result.success);

            expect(successfulResults.length).toBeLessThanOrEqual(5);
            expect(photos.length).toBe(successfulResults.length);
            expect(new Set(photos.map((photo) => photo.slot)).size).toBe(
                photos.length,
            );
            expect(new Set(photos.map((photo) => photo.fileUrl)).size).toBe(
                photos.length,
            );
        } finally {
            dateNow.mockRestore();
        }
    });
});

function createHomeVisitPhotoFormData(index: number): FormData {
    const formData = new FormData();
    const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    formData.set(
        "file",
        new File([pngBytes], `photo-${index}.png`, { type: "image/png" }),
    );
    formData.set(
        "uploadRequestId",
        `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );
    return formData;
}
