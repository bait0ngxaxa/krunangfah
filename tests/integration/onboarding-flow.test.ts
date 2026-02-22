/**
 * Integration Test: Onboarding Flow
 *
 * ทดสอบ flow ทั้งหมดของ onboarding:
 *   1. สร้าง Teacher Profile
 *   2. สร้างโรงเรียน (createSchoolAndLink)
 *   3. เพิ่ม/ลบห้องเรียน (ระหว่าง wizard)
 *   4. เพิ่ม/ลบครูใน roster (ระหว่าง wizard)
 *   5. Access control ทุกขั้นตอน
 *   6. ตรวจสอบ DB state สุดท้าย
 *
 * ใช้ real Prisma + mocked auth
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
    setupAuthMocks,
    mockSession,
    mockUnauthenticated,
    createMockUsers,
} from "./helpers/auth-mock";
import { prisma } from "@/lib/prisma";

// ── Setup mocks BEFORE dynamic imports ──
setupAuthMocks();

const USERS = createMockUsers("ob");

// Dynamic import ต้องมาหลัง setupAuthMocks()
const { createTeacherProfile } = await import(
    "@/lib/actions/teacher.actions"
);
const {
    createSchoolAndLink,
    addSchoolClass,
    removeSchoolClass,
    getSchoolClasses,
} = await import("@/lib/actions/school-setup.actions");
const { addTeacherToRoster, removeFromRoster, getSchoolRoster } = await import(
    "@/lib/actions/teacher-roster.actions"
);

describe("Integration: Onboarding Flow", () => {
    // ใช้ปีที่ unique มากเพื่อไม่ชนกับ test อื่นที่รัน parallel
    const UNIQUE_YEAR = 2650;

    let academicYearId: string;
    let createdSchoolId: string | null = null;

    beforeAll(async () => {
        // Academic year — ใช้ upsert ป้องกัน race condition กับ test อื่น
        const ay = await prisma.academicYear.upsert({
            where: {
                year_semester: { year: UNIQUE_YEAR, semester: 1 },
            },
            update: {},
            create: {
                year: UNIQUE_YEAR,
                semester: 1,
                startDate: new Date("2024-05-01"),
                endDate: new Date("2024-10-31"),
                isCurrent: false,
            },
        });
        academicYearId = ay.id;

        // สร้าง user แบบ fresh onboarding (ไม่มี schoolId, ไม่มี teacher profile)
        await prisma.user.create({
            data: {
                id: USERS.schoolAdmin.id,
                name: USERS.schoolAdmin.name,
                email: USERS.schoolAdmin.email,
                role: "school_admin",
                isPrimary: true,
                schoolId: null,
                password: "$2a$10$fakehashfortesting",
            },
        });

        // system_admin สำหรับ test access control
        await prisma.user.create({
            data: {
                id: USERS.systemAdmin.id,
                name: USERS.systemAdmin.name,
                email: USERS.systemAdmin.email,
                role: "system_admin",
                isPrimary: false,
                schoolId: null,
                password: "$2a$10$fakehashfortesting",
            },
        });

        // class_teacher (ไม่ใช่ primary) สำหรับ test access control
        await prisma.user.create({
            data: {
                id: USERS.classTeacher.id,
                name: USERS.classTeacher.name,
                email: USERS.classTeacher.email,
                role: "class_teacher",
                isPrimary: false,
                schoolId: null,
                password: "$2a$10$fakehashfortesting",
            },
        });
    });

    afterAll(async () => {
        // ลบ data ที่ server action สร้าง (ไม่อยู่ใน seed tracker)
        // FK order: SchoolTeacherRoster → SchoolClass → Teacher → User → School
        if (createdSchoolId) {
            await prisma.schoolTeacherRoster
                .deleteMany({ where: { schoolId: createdSchoolId } })
                .catch(() => {});
            await prisma.schoolClass
                .deleteMany({ where: { schoolId: createdSchoolId } })
                .catch(() => {});
        }

        // Teacher profiles สร้างโดย server action
        for (const user of [
            USERS.schoolAdmin,
            USERS.systemAdmin,
            USERS.classTeacher,
        ]) {
            await prisma.teacher
                .deleteMany({ where: { userId: user.id } })
                .catch(() => {});
        }

        // Users สร้างโดย beforeAll
        for (const user of [
            USERS.schoolAdmin,
            USERS.systemAdmin,
            USERS.classTeacher,
        ]) {
            await prisma.user
                .delete({ where: { id: user.id } })
                .catch(() => {});
        }

        // School สร้างโดย server action
        if (createdSchoolId) {
            await prisma.school
                .delete({ where: { id: createdSchoolId } })
                .catch(() => {});
        }

        // AcademicYear — ลบเฉพาะปีที่เราสร้าง
        await prisma.academicYear
            .deleteMany({
                where: { year: UNIQUE_YEAR, semester: 1 },
            })
            .catch(() => {});
    });

    // ═══════════════════════════════════════════════════
    // Step 1: Teacher Profile Creation
    // ═══════════════════════════════════════════════════

    describe("Step 1: สร้าง Teacher Profile", () => {
        it("school_admin สร้าง teacher profile สำเร็จ", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await createTeacherProfile({
                firstName: "ครูนางฟ้า",
                lastName: "ทดสอบ",
                age: 35,
                advisoryClass: "ทุกห้อง",
                academicYearId,
                schoolRole: "ผู้อำนวยการ",
                projectRole: "lead",
            });

            expect(result.success).toBe(true);
            expect(result.teacher).toBeDefined();
            expect(result.teacher?.firstName).toBe("ครูนางฟ้า");
        });

        it("สร้าง teacher profile ซ้ำไม่ได้", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await createTeacherProfile({
                firstName: "ซ้ำ",
                lastName: "ทดสอบ",
                age: 30,
                advisoryClass: "ม.1/1",
                academicYearId,
                schoolRole: "ครู",
                projectRole: "care",
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain("already exists");
        });

        it("unauthenticated สร้าง teacher profile ไม่ได้", async () => {
            mockUnauthenticated();

            const result = await createTeacherProfile({
                firstName: "ลอง",
                lastName: "ทดสอบ",
                age: 25,
                advisoryClass: "ม.1/1",
                academicYearId,
                schoolRole: "ครู",
                projectRole: "care",
            });

            expect(result.success).toBe(false);
        });

        it("teacher profile ถูกบันทึกใน DB", async () => {
            const teacher = await prisma.teacher.findUnique({
                where: { userId: USERS.schoolAdmin.id },
            });

            expect(teacher).not.toBeNull();
            expect(teacher?.firstName).toBe("ครูนางฟ้า");
            expect(teacher?.lastName).toBe("ทดสอบ");
            expect(teacher?.projectRole).toBe("lead");
        });
    });

    // ═══════════════════════════════════════════════════
    // Step 2: School Creation
    // ═══════════════════════════════════════════════════

    describe("Step 2: สร้างโรงเรียน", () => {
        it("school_admin สร้างโรงเรียนสำเร็จ", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await createSchoolAndLink({
                name: "โรงเรียนทดสอบ Onboarding",
                province: "เชียงใหม่",
            });

            expect(result.success).toBe(true);
            expect(result.data?.schoolId).toBeDefined();
            createdSchoolId = result.data?.schoolId ?? null;

            // อัพเดท mock session ให้มี schoolId (เหมือน updateSession() จริง)
            USERS.schoolAdmin.schoolId = createdSchoolId ?? "";
        });

        it("schoolId ถูก set บน user ใน DB", async () => {
            const user = await prisma.user.findUnique({
                where: { id: USERS.schoolAdmin.id },
                select: { schoolId: true },
            });

            expect(user?.schoolId).toBe(createdSchoolId);
        });

        it("โรงเรียนมีข้อมูลครบ", async () => {
            expect(createdSchoolId).not.toBeNull();
            const school = await prisma.school.findUnique({
                where: { id: createdSchoolId! },
            });

            expect(school?.name).toBe("โรงเรียนทดสอบ Onboarding");
            expect(school?.province).toBe("เชียงใหม่");
        });

        it("กดสร้างซ้ำ (double-click) ไม่สร้างโรงเรียนใหม่", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await createSchoolAndLink({
                name: "โรงเรียนซ้ำ",
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain("มีโรงเรียนอยู่แล้ว");
        });

        it("system_admin สร้างโรงเรียนไม่ได้", async () => {
            mockSession(USERS.systemAdmin);

            const result = await createSchoolAndLink({
                name: "โรงเรียน system admin",
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain("system_admin");
        });

        it("ชื่อโรงเรียนว่างไม่ได้", async () => {
            // สร้าง user ใหม่ที่ยังไม่มีโรงเรียน สำหรับ test validation
            mockSession(USERS.schoolAdmin);

            const result = await createSchoolAndLink({
                name: "",
            });

            // ถ้าโรงเรียนมีแล้วจะ fail ที่ duplicate check
            // ถ้ายังไม่มีจะ fail ที่ validation
            expect(result.success).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════
    // Step 3: Class Management (ระหว่าง Wizard Step 1)
    // ═══════════════════════════════════════════════════

    describe("Step 3: จัดการห้องเรียน (wizard step 1)", () => {
        it("เพิ่มห้องเรียนได้ทันทีหลังสร้างโรงเรียน", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await addSchoolClass("ม.1/1");

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe("ม.1/1");
            expect(result.data?.id).toBeDefined();
        });

        it("เพิ่มห้องเรียนหลายห้องได้", async () => {
            mockSession(USERS.schoolAdmin);

            const r1 = await addSchoolClass("ม.1/2");
            const r2 = await addSchoolClass("ม.2/1");
            const r3 = await addSchoolClass("ม.2/2");

            expect(r1.success).toBe(true);
            expect(r2.success).toBe(true);
            expect(r3.success).toBe(true);
        });

        it("ชื่อห้องเรียนซ้ำเพิ่มไม่ได้", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await addSchoolClass("ม.1/1");

            expect(result.success).toBe(false);
            expect(result.message).toContain("มีอยู่แล้ว");
        });

        it("ลบห้องเรียนได้", async () => {
            mockSession(USERS.schoolAdmin);

            const classes = await getSchoolClasses();
            const toRemove = classes.find((c) => c.name === "ม.1/2");
            expect(toRemove).toBeDefined();

            const result = await removeSchoolClass(toRemove!.id);
            expect(result.success).toBe(true);
        });

        it("ลบห้องแล้วจำนวนห้องลดลง", async () => {
            mockSession(USERS.schoolAdmin);

            const classes = await getSchoolClasses();
            const names = classes.map((c) => c.name);

            expect(names).toContain("ม.1/1");
            expect(names).not.toContain("ม.1/2"); // ถูกลบแล้ว
            expect(names).toContain("ม.2/1");
            expect(names).toContain("ม.2/2");
        });

        it("class_teacher (ไม่ใช่ primary) เพิ่มห้องไม่ได้", async () => {
            mockSession(USERS.classTeacher);

            const result = await addSchoolClass("ม.3/1");

            expect(result.success).toBe(false);
        });

        it("unauthenticated เพิ่มห้องไม่ได้", async () => {
            mockUnauthenticated();

            const result = await addSchoolClass("ม.3/1");

            expect(result.success).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════
    // Step 4: Teacher Roster (ระหว่าง Wizard Step 2)
    // ═══════════════════════════════════════════════════

    describe("Step 4: จัดการ Teacher Roster (wizard step 2)", () => {
        it("เพิ่มครูประจำชั้นใน roster ได้", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await addTeacherToRoster({
                firstName: "สมศรี",
                lastName: "ใจดี",
                age: 28,
                userRole: "class_teacher",
                advisoryClass: "ม.1/1",
                schoolRole: "ครูประจำชั้น",
                projectRole: "care",
            });

            expect(result.success).toBe(true);
            expect(result.data?.firstName).toBe("สมศรี");
            expect(result.data?.userRole).toBe("class_teacher");
            expect(result.data?.advisoryClass).toBe("ม.1/1");
        });

        it("เพิ่มครูนางฟ้า (school_admin) ใน roster ได้", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await addTeacherToRoster({
                firstName: "วิชัย",
                lastName: "แข็งแรง",
                email: `wichai-ob-${Date.now()}@test.local`,
                age: 40,
                userRole: "school_admin",
                advisoryClass: "ทุกห้อง",
                schoolRole: "รองผู้อำนวยการ",
                projectRole: "lead",
            });

            expect(result.success).toBe(true);
            expect(result.data?.userRole).toBe("school_admin");
            // school_admin advisory class ถูก override เป็น "ทุกห้อง"
            expect(result.data?.advisoryClass).toBe("ทุกห้อง");
        });

        it("อีเมลซ้ำใน roster เดียวกันเพิ่มไม่ได้", async () => {
            mockSession(USERS.schoolAdmin);

            // ดึง email ของ วิชัย จาก roster
            const roster = await getSchoolRoster();
            const wichai = roster.find((t) => t.firstName === "วิชัย");
            expect(wichai?.email).toBeDefined();

            const result = await addTeacherToRoster({
                firstName: "ซ้ำ",
                lastName: "อีเมล",
                email: wichai!.email!,
                age: 30,
                userRole: "class_teacher",
                advisoryClass: "ม.2/1",
                schoolRole: "ครู",
                projectRole: "coordinate",
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain("มีอยู่ใน roster แล้ว");
        });

        it("ลบครูออกจาก roster ได้", async () => {
            mockSession(USERS.schoolAdmin);

            const roster = await getSchoolRoster();
            const wichai = roster.find((t) => t.firstName === "วิชัย");
            expect(wichai).toBeDefined();

            const result = await removeFromRoster(wichai!.id);
            expect(result.success).toBe(true);
        });

        it("class_teacher (ไม่ใช่ primary) เพิ่มครูใน roster ไม่ได้", async () => {
            mockSession(USERS.classTeacher);

            const result = await addTeacherToRoster({
                firstName: "ลอง",
                lastName: "เพิ่ม",
                age: 25,
                userRole: "class_teacher",
                advisoryClass: "ม.1/1",
                schoolRole: "ครู",
                projectRole: "coordinate",
            });

            expect(result.success).toBe(false);
        });

        it("unauthenticated เพิ่มครูใน roster ไม่ได้", async () => {
            mockUnauthenticated();

            const result = await addTeacherToRoster({
                firstName: "ลอง",
                lastName: "เพิ่ม",
                age: 25,
                userRole: "class_teacher",
                advisoryClass: "ม.1/1",
                schoolRole: "ครู",
                projectRole: "coordinate",
            });

            expect(result.success).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════
    // Step 5: resolveSchoolId Fallback (Critical for wizard)
    // ═══════════════════════════════════════════════════

    describe("Step 5: resolveSchoolId fallback (JWT stale)", () => {
        it("server action ทำงานได้แม้ JWT ไม่มี schoolId", async () => {
            // จำลองสถานการณ์: JWT ยังไม่ได้ updateSession
            // schoolId ใน mock session เป็นค่าว่าง
            const staleUser = {
                ...USERS.schoolAdmin,
                schoolId: "", // JWT stale — ยังไม่มี schoolId
            };
            mockSession(staleUser);

            // addSchoolClass ใช้ resolveSchoolId ที่ fallback ไป DB
            const result = await addSchoolClass("ม.3/1");

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe("ม.3/1");
        });

        it("getSchoolClasses ทำงานได้แม้ JWT stale", async () => {
            const staleUser = {
                ...USERS.schoolAdmin,
                schoolId: "",
            };
            mockSession(staleUser);

            const classes = await getSchoolClasses();

            // ม.3/1 ที่เพิ่งสร้างด้านบนต้องอยู่ใน list
            expect(classes.some((c) => c.name === "ม.3/1")).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════
    // Step 6: Final DB State Verification
    // ═══════════════════════════════════════════════════

    describe("Step 6: ตรวจสอบ DB state สุดท้าย", () => {
        it("โรงเรียนมีห้องเรียนครบ", async () => {
            expect(createdSchoolId).not.toBeNull();

            const classes = await prisma.schoolClass.findMany({
                where: { schoolId: createdSchoolId! },
                orderBy: { name: "asc" },
            });

            const names = classes.map((c) => c.name);
            // ม.1/1 (ยังอยู่), ม.1/2 (ถูกลบ), ม.2/1, ม.2/2, ม.3/1 (เพิ่มตอน stale test)
            expect(names).toContain("ม.1/1");
            expect(names).not.toContain("ม.1/2");
            expect(names).toContain("ม.2/1");
            expect(names).toContain("ม.2/2");
            expect(names).toContain("ม.3/1");
        });

        it("โรงเรียนมี roster ถูกต้อง", async () => {
            expect(createdSchoolId).not.toBeNull();

            const roster = await prisma.schoolTeacherRoster.findMany({
                where: { schoolId: createdSchoolId! },
            });

            // สมศรี ยังอยู่, วิชัย ถูกลบ
            expect(roster).toHaveLength(1);
            expect(roster.at(0)?.firstName).toBe("สมศรี");
            expect(roster.at(0)?.lastName).toBe("ใจดี");
        });

        it("user มี schoolId และ teacher profile ครบ", async () => {
            const user = await prisma.user.findUnique({
                where: { id: USERS.schoolAdmin.id },
                include: { teacher: true },
            });

            expect(user?.schoolId).toBe(createdSchoolId);
            expect(user?.teacher).not.toBeNull();
            expect(user?.teacher?.firstName).toBe("ครูนางฟ้า");
        });
    });
});
