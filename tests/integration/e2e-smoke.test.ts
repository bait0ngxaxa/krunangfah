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

const USERS = createMockUsers("e2e-smoke");

const { getStudents } = await import("@/lib/actions/student/main");
const { deleteWorksheetUpload } = await import("@/lib/actions/activity/file-utils");

describe("Integration: E2E Smoke (Role + Advisory Class)", () => {
    let schoolId = "";
    let activityProgressId = "";
    let importedStudentId = "";

    beforeAll(async () => {
        const school = await createTestSchool({ name: "Smoke School" });
        schoolId = school.id;

        const uniqueYear = 8000 + Number(String(Date.now()).slice(-4));
        const ay = await createTestAcademicYear({ year: uniqueYear, semester: 1 });

        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        USERS.otherTeacher.schoolId = schoolId;

        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(USERS.classTeacher, schoolId);
        await createTestUser(USERS.otherTeacher, schoolId);

        await createTestTeacher(USERS.classTeacher.id, ay.id, {
            advisoryClass: "Á.1/1",
        });
        await createTestTeacher(USERS.otherTeacher.id, ay.id, {
            advisoryClass: "Á.1/2",
        });

        const importedBySchoolAdmin = await createTestStudent(schoolId, {
            class: "Á.1/1",
            firstName: "SharedClass",
        });
        importedStudentId = importedBySchoolAdmin.id;

        await createTestStudent(schoolId, {
            class: "Á.1/2",
            firstName: "OtherClass",
        });

        const phq = await createTestPhqResult(
            importedBySchoolAdmin.id,
            ay.id,
            USERS.schoolAdmin.id,
        );

        const progress = await createTestActivityProgress(
            importedBySchoolAdmin.id,
            phq.id,
            1,
            {
                status: "in_progress",
            },
        );

        activityProgressId = progress.id;
    });

    afterAll(async () => {
        await cleanupAll();
    });

    it("school_admin sees students in the whole school", async () => {
        mockSession(USERS.schoolAdmin);

        const result = await getStudents({ page: 1, limit: 50 });

        expect(result.students.length).toBeGreaterThan(1);
        expect(result.students.some((s) => s.id === importedStudentId)).toBe(
            true,
        );
        expect(result.students.every((s) => s.schoolId === schoolId)).toBe(
            true,
        );
    });

    it("class_teacher sees only own advisory class including students imported by school_admin", async () => {
        mockSession(USERS.classTeacher);

        const result = await getStudents({ page: 1, limit: 50 });

        expect(result.students.length).toBeGreaterThan(0);
        expect(result.students.every((s) => s.class === "Á.1/1")).toBe(true);
        expect(result.students.some((s) => s.id === importedStudentId)).toBe(
            true,
        );
    });

    it("class_teacher can action worksheet on own advisory class student", async () => {
        const upload = await prisma.worksheetUpload.create({
            data: {
                activityProgressId,
                worksheetNumber: 1,
                fileName: "smoke.png",
                fileUrl: "/api/uploads/worksheets/smoke.png",
                fileType: "image/png",
                fileSize: 120,
                uploadedById: USERS.schoolAdmin.id,
            },
        });

        mockSession(USERS.classTeacher);
        const result = await deleteWorksheetUpload(upload.id);

        expect(result.success).toBe(true);
    });
});
