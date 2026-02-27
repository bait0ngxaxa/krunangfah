/**
 * Integration Test: User Management
 *
 * Tests deleteUser, changeUserRole, updateTeacherProfile, getSchoolTeachers
 * using real Prisma + mocked auth.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
    setupAuthMocks,
    mockSession,
    createMockUsers,
} from "./helpers/auth-mock";
import {
    createTestSchool,
    createTestUser,
    createTestTeacher,
    createTestAcademicYear,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";

setupAuthMocks();

const USERS = createMockUsers("um");

const {
    deleteUser,
    changeUserRole,
    updateTeacherProfile,
    getSchoolTeachers,
} = await import("@/lib/actions/user-management.actions");

describe("Integration: User Management", () => {
    let schoolId: string;
    let academicYearId: string;

    beforeAll(async () => {
        const school = await createTestSchool();
        schoolId = school.id;

        const ay = await createTestAcademicYear({ year: 2598, semester: 1 });
        academicYearId = ay.id;

        // Create school class for advisory class tests
        await prisma.schoolClass.create({
            data: { schoolId, name: "ม.1/1" },
        });
        await prisma.schoolClass.create({
            data: { schoolId, name: "ม.1/2" },
        });

        // Setup users
        USERS.systemAdmin.schoolId = undefined;
        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        USERS.otherTeacher.schoolId = schoolId;

        await createTestUser(USERS.systemAdmin, schoolId);
        const saUser = await createTestUser(USERS.schoolAdmin, schoolId);
        // Set isPrimary for schoolAdmin
        await prisma.user.update({
            where: { id: saUser.id },
            data: { isPrimary: true },
        });

        await createTestUser(USERS.classTeacher, schoolId);
        await createTestUser(USERS.otherTeacher, schoolId);

        // Create teacher profiles
        await createTestTeacher(USERS.schoolAdmin.id, academicYearId, {
            advisoryClass: "ทุกห้อง",
        });
        await createTestTeacher(USERS.classTeacher.id, academicYearId, {
            advisoryClass: "ม.1/1",
        });
        await createTestTeacher(USERS.otherTeacher.id, academicYearId, {
            advisoryClass: "ม.1/2",
        });
    });

    afterAll(async () => {
        // Clean school classes
        await prisma.schoolClass
            .deleteMany({ where: { schoolId } })
            .catch(() => {});
        await cleanupAll();
    });

    // ─── deleteUser ───────────────────────────────────────────────

    describe("deleteUser", () => {
        it("system_admin cannot delete self", async () => {
            mockSession(USERS.systemAdmin);
            const result = await deleteUser(USERS.systemAdmin.id);
            expect(result.success).toBe(false);
            expect(result.message).toContain("ตัวเอง");
        });

        it("system_admin cannot delete another system_admin", async () => {
            // Create another system_admin
            const otherAdmin = await prisma.user.create({
                data: {
                    email: `other-sa-${Date.now()}@test.local`,
                    name: "Other SA",
                    role: "system_admin",
                    password: "$2a$10$fakehash",
                },
            });

            mockSession(USERS.systemAdmin);
            const result = await deleteUser(otherAdmin.id);
            expect(result.success).toBe(false);
            expect(result.message).toContain("System Admin");

            // Cleanup
            await prisma.user.delete({ where: { id: otherAdmin.id } });
        });

        it("returns error for non-existent user", async () => {
            mockSession(USERS.systemAdmin);
            const result = await deleteUser("non-existent-id");
            expect(result.success).toBe(false);
            expect(result.message).toContain("ไม่พบ");
        });

        it("successfully deletes a user", async () => {
            // Create a disposable user
            const disposable = await prisma.user.create({
                data: {
                    email: `disposable-${Date.now()}@test.local`,
                    name: "Disposable",
                    role: "class_teacher",
                    schoolId,
                    password: "$2a$10$fakehash",
                },
            });

            mockSession(USERS.systemAdmin);
            const result = await deleteUser(disposable.id);
            expect(result.success).toBe(true);

            const deleted = await prisma.user.findUnique({
                where: { id: disposable.id },
            });
            expect(deleted).toBeNull();
        });
    });

    // ─── changeUserRole ───────────────────────────────────────────

    describe("changeUserRole", () => {
        it("rejects invalid role", async () => {
            mockSession(USERS.systemAdmin);
            const result = await changeUserRole(
                USERS.classTeacher.id,
                "system_admin" as "school_admin",
            );
            expect(result.success).toBe(false);
        });

        it("cannot change system_admin role (self)", async () => {
            // system_admin role guard fires before self-check
            mockSession(USERS.systemAdmin);
            const result = await changeUserRole(
                USERS.systemAdmin.id,
                "school_admin",
            );
            expect(result.success).toBe(false);
            expect(result.message).toContain("System Admin");
        });

        it("cannot change isPrimary user role", async () => {
            mockSession(USERS.systemAdmin);
            const result = await changeUserRole(
                USERS.schoolAdmin.id,
                "class_teacher",
            );
            expect(result.success).toBe(false);
            expect(result.message).toContain("Primary Admin");
        });

        it("rejects class_teacher with advisoryClass = ทุกห้อง", async () => {
            // Create user with "ทุกห้อง" advisory class (non-primary)
            const adminUser = await prisma.user.create({
                data: {
                    email: `admin-role-${Date.now()}@test.local`,
                    name: "Admin Role Test",
                    role: "school_admin",
                    isPrimary: false,
                    schoolId,
                    password: "$2a$10$fakehash",
                },
            });
            await prisma.teacher.create({
                data: {
                    userId: adminUser.id,
                    firstName: "Admin",
                    lastName: "RoleTest",
                    age: 30,
                    advisoryClass: "ทุกห้อง",
                    academicYearId,
                    schoolRole: "ครูนางฟ้า",
                    projectRole: "care",
                },
            });

            mockSession(USERS.systemAdmin);
            const result = await changeUserRole(adminUser.id, "class_teacher");
            expect(result.success).toBe(false);
            expect(result.message).toContain("ทุกห้อง");

            // Cleanup
            await prisma.teacher
                .deleteMany({ where: { userId: adminUser.id } })
                .catch(() => {});
            await prisma.user.delete({ where: { id: adminUser.id } });
        });

        it("cannot change to same role", async () => {
            mockSession(USERS.systemAdmin);
            const result = await changeUserRole(
                USERS.classTeacher.id,
                "class_teacher",
            );
            expect(result.success).toBe(false);
            expect(result.message).toContain("ไม่เปลี่ยนแปลง");
        });
    });

    // ─── updateTeacherProfile ─────────────────────────────────────

    describe("updateTeacherProfile", () => {
        it("class_teacher cannot update profiles", async () => {
            mockSession(USERS.classTeacher);
            const result = await updateTeacherProfile(USERS.otherTeacher.id, {
                advisoryClass: "ม.1/2",
            });
            expect(result.success).toBe(false);
            expect(result.message).toContain("ไม่มีสิทธิ์");
        });

        it("cannot edit own profile", async () => {
            mockSession(USERS.schoolAdmin);
            const result = await updateTeacherProfile(USERS.schoolAdmin.id, {
                advisoryClass: "ม.1/1",
            });
            expect(result.success).toBe(false);
            expect(result.message).toContain("ตัวเอง");
        });

        it("cannot edit system_admin", async () => {
            // Create teacher profile for system admin
            const saTeacher = await prisma.teacher.findUnique({
                where: { userId: USERS.systemAdmin.id },
            });
            if (!saTeacher) {
                await prisma.teacher.create({
                    data: {
                        userId: USERS.systemAdmin.id,
                        firstName: "SA",
                        lastName: "Test",
                        age: 40,
                        advisoryClass: "ทุกห้อง",
                        academicYearId,
                        schoolRole: "ผู้ดูแลระบบ",
                        projectRole: "care",
                    },
                });
            }

            mockSession(USERS.schoolAdmin);
            const result = await updateTeacherProfile(USERS.systemAdmin.id, {
                advisoryClass: "ม.1/1",
            });
            expect(result.success).toBe(false);
            expect(result.message).toContain("System Admin");

            // Cleanup
            await prisma.teacher
                .deleteMany({ where: { userId: USERS.systemAdmin.id } })
                .catch(() => {});
        });

        it("primary admin must stay ทุกห้อง", async () => {
            mockSession(USERS.systemAdmin);
            const result = await updateTeacherProfile(USERS.schoolAdmin.id, {
                advisoryClass: "ม.1/1",
            });
            expect(result.success).toBe(false);
            expect(result.message).toContain("Primary Admin");
        });

        it("rejects non-existent class", async () => {
            mockSession(USERS.schoolAdmin);
            const result = await updateTeacherProfile(USERS.classTeacher.id, {
                advisoryClass: "ม.99/99",
            });
            expect(result.success).toBe(false);
            expect(result.message).toContain("ไม่พบห้องเรียน");
        });

        it("auto-sets role to class_teacher for real class", async () => {
            // First change otherTeacher to school_admin
            await prisma.user.update({
                where: { id: USERS.otherTeacher.id },
                data: { role: "school_admin" },
            });

            mockSession(USERS.schoolAdmin);
            const result = await updateTeacherProfile(USERS.otherTeacher.id, {
                advisoryClass: "ม.1/2",
            });
            expect(result.success).toBe(true);

            const updated = await prisma.user.findUnique({
                where: { id: USERS.otherTeacher.id },
            });
            expect(updated!.role).toBe("class_teacher");
        });

        it("auto-sets role to school_admin for ทุกห้อง", async () => {
            // otherTeacher is now class_teacher from previous test
            mockSession(USERS.schoolAdmin);
            const result = await updateTeacherProfile(USERS.otherTeacher.id, {
                advisoryClass: "ทุกห้อง",
            });
            expect(result.success).toBe(true);

            const updated = await prisma.user.findUnique({
                where: { id: USERS.otherTeacher.id },
            });
            expect(updated!.role).toBe("school_admin");

            // Restore to class_teacher for other tests
            await prisma.user.update({
                where: { id: USERS.otherTeacher.id },
                data: { role: "class_teacher" },
            });
            await prisma.teacher.update({
                where: { userId: USERS.otherTeacher.id },
                data: { advisoryClass: "ม.1/2" },
            });
        });

        it("rejects empty advisory class", async () => {
            mockSession(USERS.schoolAdmin);
            const result = await updateTeacherProfile(USERS.classTeacher.id, {
                advisoryClass: "   ",
            });
            expect(result.success).toBe(false);
            expect(result.message).toContain("กรุณาเลือก");
        });
    });

    // ─── getSchoolTeachers ────────────────────────────────────────

    describe("getSchoolTeachers", () => {
        it("class_teacher gets empty array", async () => {
            mockSession(USERS.classTeacher);
            const result = await getSchoolTeachers();
            expect(result).toEqual([]);
        });

        it("primary school_admin gets teachers in own school", async () => {
            mockSession(USERS.schoolAdmin);
            const result = await getSchoolTeachers();
            expect(result.length).toBeGreaterThan(0);
            expect(result.every((t) => t.schoolId === schoolId)).toBe(true);
        });

        it("system_admin can get teachers by schoolId", async () => {
            mockSession(USERS.systemAdmin);
            const result = await getSchoolTeachers(schoolId);
            expect(result.length).toBeGreaterThan(0);
        });

        it("returned items have expected shape", async () => {
            mockSession(USERS.schoolAdmin);
            const result = await getSchoolTeachers();
            const teacher = result.find((t) => t.id === USERS.classTeacher.id);
            expect(teacher).toBeDefined();
            expect(teacher!.hasTeacherProfile).toBe(true);
            expect(teacher!.teacherName).toBeTruthy();
            expect(teacher!.advisoryClass).toBeTruthy();
        });
    });
});
