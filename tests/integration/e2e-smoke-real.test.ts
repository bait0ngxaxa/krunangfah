import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
    createMockUsers,
    mockSession,
    mockUnauthenticated,
    setupAuthMocks,
} from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestSchool,
    createTestTeacher,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

setupAuthMocks();

const USERS = createMockUsers("e2e-smoke-real");

const { importStudents } = await import("@/lib/actions/student/mutations");
const { getStudents } = await import("@/lib/actions/student/main");
const { deleteWorksheetUpload } = await import("@/lib/actions/activity/file-utils");

describe("Integration: E2E Smoke (Auth + Import + Role Scope)", () => {
    let schoolId = "";
    let academicYearId = "";
    let class1StudentDbId = "";
    let class1ActivityProgressId = "";
    let class1StudentCode = "";
    let class2StudentCode = "";

    beforeAll(async () => {
        const school = await createTestSchool({ name: "E2E Smoke School" });
        schoolId = school.id;

        const uniqueYear = 7000 + Number(String(Date.now()).slice(-4));
        const ay = await createTestAcademicYear({ year: uniqueYear, semester: 1 });
        academicYearId = ay.id;

        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        USERS.otherTeacher.schoolId = schoolId;

        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(USERS.classTeacher, schoolId);
        await createTestUser(USERS.otherTeacher, schoolId);

        await createTestTeacher(USERS.classTeacher.id, academicYearId, {
            advisoryClass: "class-1",
        });
        await createTestTeacher(USERS.otherTeacher.id, academicYearId, {
            advisoryClass: "class-2",
        });

        const rows: ParsedStudent[] = [
            {
                studentId: `E2E-1-${Date.now()}`,
                firstName: "Smoke",
                lastName: "Class1",
                class: "class-1",
                scores: {
                    q1: 1,
                    q2: 1,
                    q3: 1,
                    q4: 1,
                    q5: 1,
                    q6: 0,
                    q7: 0,
                    q8: 0,
                    q9: 0,
                    q9a: false,
                    q9b: false,
                },
            },
            {
                studentId: `E2E-2-${Date.now()}`,
                firstName: "Smoke",
                lastName: "Class2",
                class: "class-2",
                scores: {
                    q1: 1,
                    q2: 1,
                    q3: 1,
                    q4: 1,
                    q5: 1,
                    q6: 0,
                    q7: 0,
                    q8: 0,
                    q9: 0,
                    q9a: false,
                    q9b: false,
                },
            },
        ];

        class1StudentCode = rows[0].studentId;
        class2StudentCode = rows[1].studentId;

        mockSession(USERS.schoolAdmin);
        const importResult = await importStudents(rows, academicYearId, 1);
        expect(importResult.imported).toBe(2);

        const class1Student = await prisma.student.findFirst({
            where: { schoolId, studentId: class1StudentCode },
            orderBy: { createdAt: "desc" },
        });

        expect(class1Student).toBeTruthy();
        class1StudentDbId = class1Student!.id;

        const progress = await prisma.activityProgress.findFirst({
            where: { studentId: class1StudentDbId },
            orderBy: { activityNumber: "asc" },
        });

        expect(progress).toBeTruthy();
        class1ActivityProgressId = progress!.id;
    });

    afterAll(async () => {
        const importedStudents = await prisma.student.findMany({
            where: {
                schoolId,
                studentId: { in: [class1StudentCode, class2StudentCode] },
            },
            select: { id: true },
        });

        const importedStudentIds = importedStudents.map((s) => s.id);

        if (importedStudentIds.length > 0) {
            const progress = await prisma.activityProgress.findMany({
                where: { studentId: { in: importedStudentIds } },
                select: { id: true },
            });
            const progressIds = progress.map((p) => p.id);

            if (progressIds.length > 0) {
                await prisma.worksheetUpload
                    .deleteMany({
                        where: { activityProgressId: { in: progressIds } },
                    })
                    .catch(() => {});

                await prisma.activityProgress
                    .deleteMany({
                        where: { id: { in: progressIds } },
                    })
                    .catch(() => {});
            }

            await prisma.phqResult
                .deleteMany({
                    where: { studentId: { in: importedStudentIds } },
                })
                .catch(() => {});

            await prisma.student
                .deleteMany({
                    where: { id: { in: importedStudentIds } },
                })
                .catch(() => {});
        }

        await cleanupAll();
    });

    it("auth/session smoke: unauthenticated gets empty student list, authenticated gets data", async () => {
        mockUnauthenticated();
        const guest = await getStudents({ page: 1, limit: 20 });
        expect(guest.students).toEqual([]);

        mockSession(USERS.schoolAdmin);
        const admin = await getStudents({ page: 1, limit: 20 });
        expect(admin.students.length).toBeGreaterThanOrEqual(2);
    });

    it("class_teacher sees imported students in own advisory class", async () => {
        mockSession(USERS.classTeacher);
        const result = await getStudents({ page: 1, limit: 50 });

        expect(result.students.length).toBeGreaterThan(0);
        expect(result.students.every((s) => s.class === "class-1")).toBe(true);
    });

    it("class_teacher in another advisory class cannot see class-1 students", async () => {
        mockSession(USERS.otherTeacher);
        const result = await getStudents({ page: 1, limit: 50 });

        expect(result.students.length).toBeGreaterThan(0);
        expect(result.students.every((s) => s.class === "class-2")).toBe(true);
        expect(result.students.some((s) => s.id === class1StudentDbId)).toBe(false);
    });

    it("role action scope: owner can delete worksheet, non-owner cannot", async () => {
        const upload = await prisma.worksheetUpload.create({
            data: {
                activityProgressId: class1ActivityProgressId,
                worksheetNumber: 1,
                fileName: "e2e-smoke.png",
                fileUrl: "/api/uploads/worksheets/e2e-smoke.png",
                fileType: "image/png",
                fileSize: 128,
                uploadedById: USERS.schoolAdmin.id,
            },
        });

        mockSession(USERS.otherTeacher);
        const denied = await deleteWorksheetUpload(upload.id);
        expect(denied.success).toBe(false);

        mockSession(USERS.classTeacher);
        const allowed = await deleteWorksheetUpload(upload.id);
        expect(allowed.success).toBe(true);
    });
});

