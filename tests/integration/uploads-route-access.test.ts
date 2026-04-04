/**
 * Integration Test: Upload Route Access Control
 *
 * Verifies /api/uploads/worksheets/* enforces advisory-class access
 * even when called directly (HTTP route-level check).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { join } from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import {
    createMockUsers,
    mockSession,
    mockUnauthenticated,
    setupAuthMocks,
    type MockUser,
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

setupAuthMocks();

const USERS = createMockUsers("uar");
const SAME_SCHOOL_OTHER_CLASS_TEACHER: MockUser = {
    id: `ssc-${Date.now().toString(36)}`,
    name: "Same School Other Class",
    email: `ssc-${Date.now().toString(36)}@test.local`,
    role: "class_teacher",
    schoolId: "",
};

const { GET } = await import("@/app/api/uploads/[...path]/route");

describe("Integration: Upload Route Access Control", () => {
    let filename = "";

    beforeAll(async () => {
        const school = await createTestSchool({ name: "Upload Route School" });
        const ay = await createTestAcademicYear({ year: 2601, semester: 1 });

        USERS.schoolAdmin.schoolId = school.id;
        USERS.classTeacher.schoolId = school.id;
        SAME_SCHOOL_OTHER_CLASS_TEACHER.schoolId = school.id;

        await createTestUser(USERS.schoolAdmin, school.id);
        await createTestUser(USERS.classTeacher, school.id);
        await createTestUser(SAME_SCHOOL_OTHER_CLASS_TEACHER, school.id);

        await createTestTeacher(USERS.classTeacher.id, ay.id, {
            advisoryClass: "ม.2/5",
        });
        await createTestTeacher(SAME_SCHOOL_OTHER_CLASS_TEACHER.id, ay.id, {
            advisoryClass: "ม.2/6",
        });

        const student = await createTestStudent(school.id, {
            class: "ม.2/5",
        });

        const phq = await createTestPhqResult(student.id, ay.id, USERS.schoolAdmin.id);

        const ap = await createTestActivityProgress(student.id, phq.id, 1, {
            status: "in_progress",
        });

        filename = `route-test-${Date.now()}.png`;
        const uploadDir = join(process.cwd(), ".data", "uploads", "worksheets");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Minimal PNG header bytes so route can serve a valid-looking image.
        const pngBytes = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);
        await writeFile(join(uploadDir, filename), pngBytes);

        await prisma.worksheetUpload.create({
            data: {
                activityProgressId: ap.id,
                worksheetNumber: 1,
                fileName: filename,
                fileUrl: `/api/uploads/worksheets/${filename}`,
                fileType: "image/png",
                fileSize: pngBytes.length,
                uploadedById: USERS.schoolAdmin.id,
            },
        });
    });

    afterAll(async () => {
        const path = join(process.cwd(), ".data", "uploads", "worksheets", filename);
        await unlink(path).catch(() => {});
        await cleanupAll();
    });

    const buildReq = () =>
        new NextRequest(`http://localhost/api/uploads/worksheets/${filename}`, {
            method: "GET",
        });

    it("class_teacher in same advisory class can access file", async () => {
        mockSession(USERS.classTeacher);

        const response = await GET(buildReq(), {
            params: Promise.resolve({ path: ["worksheets", filename] }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/png");
    });

    it("class_teacher in same school but different advisory class gets 403", async () => {
        mockSession(SAME_SCHOOL_OTHER_CLASS_TEACHER);

        const response = await GET(buildReq(), {
            params: Promise.resolve({ path: ["worksheets", filename] }),
        });

        expect(response.status).toBe(403);
    });

    it("school_admin in same school can access file", async () => {
        mockSession(USERS.schoolAdmin);

        const response = await GET(buildReq(), {
            params: Promise.resolve({ path: ["worksheets", filename] }),
        });

        expect(response.status).toBe(200);
    });

    it("unauthenticated request gets 401", async () => {
        mockUnauthenticated();

        const response = await GET(buildReq(), {
            params: Promise.resolve({ path: ["worksheets", filename] }),
        });

        expect(response.status).toBe(401);
    });
});

