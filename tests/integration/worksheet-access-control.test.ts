import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
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

setupAuthMocks();

const USERS = createMockUsers("wac");

const { uploadWorksheet, deleteWorksheetUpload } = await import(
    "@/lib/actions/activity/file-utils"
);

describe("Integration: Worksheet Access Control", () => {
    let activityProgressId = "";

    beforeAll(async () => {
        const school = await createTestSchool({ name: "Worksheet School" });
        const ay = await createTestAcademicYear({ year: 2600, semester: 1 });

        USERS.schoolAdmin.schoolId = school.id;
        USERS.classTeacher.schoolId = school.id;
        USERS.otherTeacher.schoolId = school.id;

        await createTestUser(USERS.schoolAdmin, school.id);
        await createTestUser(USERS.classTeacher, school.id);
        await createTestUser(USERS.otherTeacher, school.id);

        await createTestTeacher(USERS.classTeacher.id, ay.id, {
            advisoryClass: "ม.2/5",
        });
        await createTestTeacher(USERS.otherTeacher.id, ay.id, {
            advisoryClass: "ม.2/6",
        });

        const student = await createTestStudent(school.id, {
            class: "ม.2/6",
        });

        const phq = await createTestPhqResult(
            student.id,
            ay.id,
            USERS.schoolAdmin.id,
        );

        const progress = await createTestActivityProgress(student.id, phq.id, 1, {
            status: "in_progress",
        });

        activityProgressId = progress.id;
    });

    afterAll(async () => {
        await cleanupAll();
    });

    it("class_teacher cannot upload worksheet for same-school student outside advisory class", async () => {
        mockSession(USERS.classTeacher);

        const pngBytes = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);
        const file = new File([pngBytes], "worksheet.png", {
            type: "image/png",
        });
        const formData = new FormData();
        formData.set("file", file);

        const result = await uploadWorksheet(activityProgressId, formData);
        expect(result.success).toBe(false);
    });

    it("class_teacher cannot delete worksheet for same-school student outside advisory class", async () => {
        const upload = await prisma.worksheetUpload.create({
            data: {
                activityProgressId,
                worksheetNumber: 1,
                fileName: "worksheet.png",
                fileUrl: "/api/uploads/worksheets/fake-file.png",
                fileType: "image/png",
                fileSize: 100,
                uploadedById: USERS.schoolAdmin.id,
            },
        });

        mockSession(USERS.classTeacher);
        const result = await deleteWorksheetUpload(upload.id);
        expect(result.success).toBe(false);
    });

    it("school_admin can delete worksheet in own school", async () => {
        const upload = await prisma.worksheetUpload.create({
            data: {
                activityProgressId,
                worksheetNumber: 2,
                fileName: "worksheet-2.png",
                fileUrl: "/api/uploads/worksheets/fake-file-2.png",
                fileType: "image/png",
                fileSize: 120,
                uploadedById: USERS.schoolAdmin.id,
            },
        });

        mockSession(USERS.schoolAdmin);
        const result = await deleteWorksheetUpload(upload.id);
        expect(result.success).toBe(true);
    });
});

