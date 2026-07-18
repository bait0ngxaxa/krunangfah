import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMockUsers, mockSession, setupAuthMocks } from "./helpers/auth-mock";
import { prisma } from "@/lib/database/prisma";

setupAuthMocks();

const USERS = createMockUsers("school-create");
const SCHOOL_NAME_PREFIX = `โรงเรียนทดสอบสร้าง-${Date.now().toString(36)}`;
const CONCURRENT_NAME_PREFIX = SCHOOL_NAME_PREFIX + "-concurrent";
const { createSchoolAndLink } = await import("@/lib/actions/school-setup.actions");

describe("createSchoolAndLink", () => {
    beforeAll(async () => {
        await prisma.user.createMany({
            data: [USERS.schoolAdmin, USERS.systemAdmin, USERS.classTeacher].map(
                (user) => ({
                    ...user,
                    isPrimary: false,
                    schoolId: null,
                    password: "$2a$10$fakehashfortesting",
                }),
            ),
        });
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: { id: { in: [USERS.schoolAdmin.id, USERS.systemAdmin.id, USERS.classTeacher.id] } },
        });
        await prisma.school.deleteMany({
            where: { name: { startsWith: SCHOOL_NAME_PREFIX } },
        });
    });

    it.each([
        ["class_teacher", USERS.classTeacher],
        ["system_admin", USERS.systemAdmin],
    ] as const)("ไม่อนุญาตให้ %s สร้างโรงเรียนผ่าน flow นี้", async (_role, user) => {
        mockSession(user);
        const result = await createSchoolAndLink({
            name: `${SCHOOL_NAME_PREFIX}-${user.role}`,
        });
        expect(result.success).toBe(false);
        expect(await prisma.school.count({
            where: { name: `${SCHOOL_NAME_PREFIX}-${user.role}` },
        })).toBe(0);
    });

    it("ให้ concurrent request สำเร็จเพียงครั้งเดียวและกำหนดผู้สร้างเป็น primary", async () => {
        mockSession(USERS.schoolAdmin);
        const results = await Promise.all([
            createSchoolAndLink({ name: `${CONCURRENT_NAME_PREFIX}-หนึ่ง` }),
            createSchoolAndLink({ name: `${CONCURRENT_NAME_PREFIX}-สอง` }),
        ]);
        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect(await prisma.school.count({
            where: { name: { startsWith: CONCURRENT_NAME_PREFIX } },
        })).toBe(1);

        const creator = await prisma.user.findUniqueOrThrow({
            where: { id: USERS.schoolAdmin.id },
            select: { schoolId: true, isPrimary: true },
        });
        expect(creator.schoolId).not.toBeNull();
        expect(creator.isPrimary).toBe(true);
    });
});
