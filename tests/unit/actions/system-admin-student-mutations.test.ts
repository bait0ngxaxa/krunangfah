import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { Actor } from "@/lib/actions/system-admin/mutations";
import { updateSystemStudent } from "@/lib/actions/system-admin/mutations";
import type { SystemStudentEditInput } from "@/lib/validations/system-admin.validation";
import type { StudentStatusValue } from "@/lib/constants/student-status";

const prismaMocks = vi.hoisted(() => ({
    transaction: vi.fn(),
    studentFindUnique: vi.fn(),
    studentUpdateMany: vi.fn(),
    schoolClassFindUnique: vi.fn(),
    schoolClassUpdate: vi.fn(),
    schoolClassUpdateMany: vi.fn(),
    schoolClassTermUpsert: vi.fn(),
    schoolClassTermUpdateMany: vi.fn(),
    academicYearFindFirst: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
    revalidateAnalyticsCache: vi.fn(),
    revalidateDashboardCache: vi.fn(),
    revalidateStudentsCache: vi.fn(),
    revalidatePath: vi.fn(),
}));

const eventMocks = vi.hoisted(() => ({
    createSystemAdminEditEvent: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: { $transaction: prismaMocks.transaction },
}));

vi.mock("next/cache", () => ({
    revalidatePath: cacheMocks.revalidatePath,
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: cacheMocks.revalidateAnalyticsCache,
}));

vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: cacheMocks.revalidateDashboardCache,
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: cacheMocks.revalidateStudentsCache,
}));

vi.mock("@/lib/actions/system-admin/events", () => ({
    createSystemAdminEditEvent: eventMocks.createSystemAdminEditEvent,
}));

const actor: Actor = {
    id: "admin-1",
    email: "admin@example.com",
    name: "ผู้ดูแลระบบ",
    role: "system_admin",
};

function createInput(
    overrides: Partial<SystemStudentEditInput> = {},
): SystemStudentEditInput {
    return {
        id: "student-1",
        expectedUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
        studentId: "1001",
        nationalId: "1234567890123",
        firstName: "สมชาย",
        lastName: "ใจดี",
        gender: "MALE",
        age: 13,
        class: "ม.1/1",
        status: "ACTIVE",
        reason: "แก้ข้อมูลนำเข้าผิด",
        ...overrides,
    };
}

type StudentRow = Omit<
    ReturnType<typeof createStudentRowBase>,
    "status" | "leftAt"
> & {
    status: StudentStatusValue;
    leftAt: Date | null;
};

function createStudentRow(overrides: Partial<StudentRow> = {}): StudentRow {
    return { ...createStudentRowBase(), ...overrides };
}

function createStudentRowBase() {
    return {
        id: "student-1",
        studentId: "1001",
        firstName: "สมชาย",
        lastName: "ใจดี",
        nationalId: "1234567890123",
        gender: "MALE" as const,
        age: 13,
        class: "ม.1/1",
        status: "ACTIVE" as const,
        statusChangedAt: new Date("2026-01-01T00:00:00.000Z"),
        leftAt: null,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        disabledAt: null,
        isTestData: false,
        schoolId: "school-1",
        school: {
            name: "โรงเรียนทดสอบ",
            disabledAt: null,
            isTestData: false,
            classes: [
                { id: "class-a", name: "ม.1/1" },
                { id: "class-b", name: "ม.1/2" },
            ],
        },
    };
}

function createClassRecord(name: string) {
    const expectedStudentCount = name === "ม.1/1" ? 30 : 24;
    return {
        id: name === "ม.1/1" ? "class-a" : "class-b",
        expectedStudentCount,
        terms: [{ expectedStudentCount }],
    };
}

function configureTransaction(
    student = createStudentRow(),
): void {
    const tx = {
        student: {
            findUnique: prismaMocks.studentFindUnique,
            updateMany: prismaMocks.studentUpdateMany,
        },
        schoolClass: {
            findUnique: prismaMocks.schoolClassFindUnique,
            update: prismaMocks.schoolClassUpdate,
            updateMany: prismaMocks.schoolClassUpdateMany,
        },
        schoolClassTerm: {
            upsert: prismaMocks.schoolClassTermUpsert,
            updateMany: prismaMocks.schoolClassTermUpdateMany,
        },
        academicYear: { findFirst: prismaMocks.academicYearFindFirst },
    };

    prismaMocks.studentFindUnique.mockResolvedValue(student);
    prismaMocks.studentUpdateMany.mockResolvedValue({ count: 1 });
    prismaMocks.schoolClassFindUnique.mockImplementation(({ where }) =>
        Promise.resolve(createClassRecord(where.schoolId_name.name)),
    );
    prismaMocks.academicYearFindFirst.mockResolvedValue({ id: "ay-1" });
    prismaMocks.schoolClassUpdate.mockImplementation(({ where }) =>
        Promise.resolve({
            id: where.id,
            expectedStudentCount: where.id === "class-a" ? 30 : 24,
        }),
    );
    prismaMocks.schoolClassUpdateMany.mockResolvedValue({ count: 1 });
    prismaMocks.schoolClassTermUpsert.mockImplementation(({ where }) =>
        Promise.resolve({ id: `term-${where.schoolClassId_academicYearId.schoolClassId}` }),
    );
    prismaMocks.schoolClassTermUpdateMany.mockResolvedValue({ count: 1 });
    prismaMocks.transaction.mockImplementation(async (callback) => callback(tx));
}

function expectSuccessfulCacheInvalidation(): void {
    expect(cacheMocks.revalidateStudentsCache).toHaveBeenCalledWith(
        "school-1",
        "student-1",
    );
    expect(cacheMocks.revalidateAnalyticsCache).toHaveBeenCalledWith("school-1");
    expect(cacheMocks.revalidateDashboardCache).toHaveBeenCalledOnce();
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/school/classes");
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/admin/system");
}

function createUniqueError(target: string[]): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "6.19.2",
        meta: { target },
    });
}

describe("updateSystemStudent", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        configureTransaction();
        eventMocks.createSystemAdminEditEvent.mockResolvedValue(undefined);
    });

    it("sets leftAt and decrements class and term for ACTIVE → GRADUATED", async () => {
        const result = await updateSystemStudent(
            createInput({ status: "GRADUATED" }),
            actor,
        );

        expect(result.success).toBe(true);
        const updateData = prismaMocks.studentUpdateMany.mock.calls[0][0].data;
        expect(updateData.status).toBe("GRADUATED");
        expect(updateData.leftAt).toBeInstanceOf(Date);
        expect(updateData.statusChangedAt).toBeInstanceOf(Date);
        expect(prismaMocks.schoolClassUpdateMany).toHaveBeenCalledWith({
            where: {
                id: "class-a",
                expectedStudentCount: { gte: 1 },
            },
            data: { expectedStudentCount: { decrement: 1 } },
        });
        expect(prismaMocks.schoolClassTermUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                update: { expectedStudentCount: { increment: 0 } },
            }),
        );
        expect(prismaMocks.schoolClassTermUpdateMany).toHaveBeenCalledWith({
            where: { id: "term-class-a", expectedStudentCount: { gte: 1 } },
            data: { expectedStudentCount: { decrement: 1 } },
        });
        expect(eventMocks.createSystemAdminEditEvent).toHaveBeenCalledOnce();
        expect(
            eventMocks.createSystemAdminEditEvent.mock.calls[0][0].changes.map(
                (change: { field: string }) => change.field,
            ),
        ).toEqual(expect.arrayContaining(["status", "statusChangedAt", "leftAt"]));
        expectSuccessfulCacheInvalidation();
    });

    it("clears leftAt and increments class and term for GRADUATED → ACTIVE", async () => {
        configureTransaction(
            createStudentRow({
                status: "GRADUATED",
                leftAt: new Date("2026-06-01T00:00:00.000Z"),
            }),
        );

        const result = await updateSystemStudent(createInput(), actor);

        expect(result.success).toBe(true);
        const updateData = prismaMocks.studentUpdateMany.mock.calls[0][0].data;
        expect(updateData.leftAt).toBeNull();
        expect(updateData.statusChangedAt).toBeInstanceOf(Date);
        expect(prismaMocks.schoolClassUpdateMany).toHaveBeenCalledWith({
            where: { id: "class-a" },
            data: { expectedStudentCount: { increment: 1 } },
        });
    });

    it("keeps leftAt and does not adjust counts for RESIGNED → TRANSFERRED", async () => {
        const leftAt = new Date("2026-06-01T00:00:00.000Z");
        configureTransaction(
            createStudentRow({ status: "RESIGNED", leftAt }),
        );

        const result = await updateSystemStudent(
            createInput({ status: "TRANSFERRED" }),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.studentUpdateMany.mock.calls[0][0].data.leftAt).toBe(
            leftAt,
        );
        expect(prismaMocks.schoolClassUpdate).not.toHaveBeenCalled();
        expect(prismaMocks.schoolClassTermUpsert).not.toHaveBeenCalled();
    });

    it("moves an active student from class A to class B", async () => {
        const result = await updateSystemStudent(
            createInput({ class: "ม.1/2" }),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.schoolClassUpdateMany).toHaveBeenCalledWith({
            where: {
                id: "class-a",
                expectedStudentCount: { gte: 1 },
            },
            data: { expectedStudentCount: { decrement: 1 } },
        });
        expect(prismaMocks.schoolClassUpdateMany).toHaveBeenCalledWith({
            where: { id: "class-b" },
            data: { expectedStudentCount: { increment: 1 } },
        });
    });

    it("moves ACTIVE A to GRADUATED B without incrementing B", async () => {
        const result = await updateSystemStudent(
            createInput({ class: "ม.1/2", status: "GRADUATED" }),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.schoolClassUpdate).toHaveBeenCalledTimes(1);
        expect(prismaMocks.schoolClassUpdateMany).toHaveBeenCalledWith({
            where: {
                id: "class-a",
                expectedStudentCount: { gte: 1 },
            },
            data: { expectedStudentCount: { decrement: 1 } },
        });
    });

    it("moves GRADUATED A to ACTIVE B without decrementing A", async () => {
        configureTransaction(createStudentRow({ status: "GRADUATED" }));

        const result = await updateSystemStudent(
            createInput({ class: "ม.1/2" }),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.schoolClassUpdate).toHaveBeenCalledTimes(1);
        expect(prismaMocks.schoolClassUpdateMany).toHaveBeenCalledWith({
            where: { id: "class-b" },
            data: { expectedStudentCount: { increment: 1 } },
        });
    });

    it("moves GRADUATED A to TRANSFERRED B without adjusting either class", async () => {
        configureTransaction(createStudentRow({ status: "GRADUATED" }));

        const result = await updateSystemStudent(
            createInput({ class: "ม.1/2", status: "TRANSFERRED" }),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.schoolClassUpdate).not.toHaveBeenCalled();
        expect(prismaMocks.schoolClassTermUpsert).not.toHaveBeenCalled();
    });

    it("does not write class counts when the class and status are unchanged", async () => {
        const result = await updateSystemStudent(
            createInput({ firstName: "สมหญิง" }),
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.schoolClassUpdate).not.toHaveBeenCalled();
        expect(prismaMocks.schoolClassTermUpsert).not.toHaveBeenCalled();
    });

    it("stores only masked national IDs in the audit change", async () => {
        const result = await updateSystemStudent(
            createInput({ nationalId: "G1234567890123" }),
            actor,
        );

        expect(result.success).toBe(true);
        const changes = eventMocks.createSystemAdminEditEvent.mock.calls[0][0]
            .changes as Array<{
            field: string;
            before: string | null;
            after: string | null;
        }>;
        expect(changes).toContainEqual({
            field: "nationalId",
            label: "เลขบัตรประชาชน",
            before: "*********0123",
            after: "G*********0123",
        });
        expect(JSON.stringify(changes)).not.toContain("1234567890123");
    });

    it("rejects a class outside the student's school inside the transaction", async () => {
        prismaMocks.schoolClassFindUnique.mockResolvedValue(null);

        const result = await updateSystemStudent(
            createInput({ class: "ม.9/9" }),
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "ไม่พบห้องเรียนนี้ในโรงเรียน",
        });
        expect(prismaMocks.transaction).toHaveBeenCalledOnce();
        expect(prismaMocks.studentUpdateMany).not.toHaveBeenCalled();
        expect(eventMocks.createSystemAdminEditEvent).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
    });

    it.each([
        ["studentId", "รหัสนักเรียนนี้มีอยู่ในโรงเรียนแล้ว"],
        ["nationalId", "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว"],
    ] as const)("maps duplicate %s errors", async (field, message) => {
        prismaMocks.studentUpdateMany.mockRejectedValue(createUniqueError([field]));

        const result = await updateSystemStudent(
            createInput({
                studentId: field === "studentId" ? "duplicate" : "1001",
                nationalId:
                    field === "nationalId" ? "9999999999999" : "1234567890123",
            }),
            actor,
        );

        expect(result).toEqual({ success: false, message });
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
        expect(eventMocks.createSystemAdminEditEvent).not.toHaveBeenCalled();
    });

    it("returns a conflict when updatedAt no longer matches", async () => {
        prismaMocks.studentUpdateMany.mockResolvedValue({ count: 0 });

        const result = await updateSystemStudent(
            createInput({ firstName: "ข้อมูลใหม่" }),
            actor,
        );

        expect(result).toEqual({
            success: false,
            message:
                "ข้อมูลนักเรียนถูกแก้ไขโดยผู้ใช้อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่",
        });
        expect(prismaMocks.studentUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: "student-1",
                    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
                },
            }),
        );
        expect(eventMocks.createSystemAdminEditEvent).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
    });

    it("does not revalidate when a class count update fails", async () => {
        prismaMocks.schoolClassUpdate.mockRejectedValue(new Error("count failed"));

        await expect(
            updateSystemStudent(createInput({ class: "ม.1/2" }), actor),
        ).rejects.toThrow("count failed");
        expect(eventMocks.createSystemAdminEditEvent).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
    });

    it("does not revalidate when audit creation fails", async () => {
        eventMocks.createSystemAdminEditEvent.mockRejectedValue(
            new Error("audit failed"),
        );

        await expect(
            updateSystemStudent(createInput({ firstName: "ใหม่" }), actor),
        ).rejects.toThrow("audit failed");
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
    });
});
