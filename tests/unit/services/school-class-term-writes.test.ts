import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => {
    const tx = {
        schoolClass: { create: vi.fn(), update: vi.fn() },
        schoolClassTerm: { create: vi.fn(), upsert: vi.fn() },
    };
    return {
        tx,
        academicYear: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
        },
        $transaction: vi.fn(async (run: (client: typeof tx) => unknown) =>
            run(tx),
        ),
    };
});

vi.mock("@/lib/database/prisma", () => ({ prisma: prismaMock }));

const {
    createSchoolClassWithTerms,
    resolveClassTermWritePlan,
    updateSchoolClassTermCount,
} = await import("@/lib/services/school-class-term-writes");

const previousYearSemesterTwo = { id: "ay-2568-2", year: 2568, semester: 2 };
const semesterOne = { id: "ay-2569-1", year: 2569, semester: 1 };
const semesterTwo = { id: "ay-2569-2", year: 2569, semester: 2 };
const allTerms = [previousYearSemesterTwo, semesterOne, semesterTwo];

function mockTerms(current = semesterTwo): void {
    prismaMock.academicYear.findUnique.mockImplementation(
        async ({ where }: { where: { id: string } }) =>
            allTerms.find((term) => term.id === where.id) ?? null,
    );
    prismaMock.academicYear.findFirst.mockResolvedValue({
        ...current,
        isCurrent: true,
    });
    prismaMock.academicYear.findMany.mockImplementation(
        async ({ where }: { where: { year: { gte: number; lte: number } } }) =>
            allTerms.filter(
                (term) =>
                    term.year >= where.year.gte && term.year <= where.year.lte,
            ),
    );
}

describe("resolveClassTermWritePlan", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        // 1 Dec 2026 (B.E. 2569, semester 2).
        vi.setSystemTime(new Date("2026-12-01T05:00:00.000Z"));
        mockTerms();
    });

    it("treats an omitted term as the current term", async () => {
        await expect(resolveClassTermWritePlan()).resolves.toEqual({
            ok: true,
            plan: {
                targetTermId: semesterTwo.id,
                writesClassCount: true,
                newClassTermIds: [semesterTwo.id],
            },
        });
    });

    it("writes the class count only for the current term", async () => {
        await expect(resolveClassTermWritePlan(semesterTwo.id)).resolves.toEqual({
            ok: true,
            plan: {
                targetTermId: semesterTwo.id,
                writesClassCount: true,
                newClassTermIds: [semesterTwo.id],
            },
        });
    });

    it("plans an earlier term through the current term without touching the class count", async () => {
        await expect(resolveClassTermWritePlan(semesterOne.id)).resolves.toEqual({
            ok: true,
            plan: {
                targetTermId: semesterOne.id,
                writesClassCount: false,
                newClassTermIds: [semesterOne.id, semesterTwo.id],
            },
        });
    });

    it.each([previousYearSemesterTwo.id, "missing-term"])(
        "rejects %s, which is outside the current academic year",
        async (academicYearId) => {
            await expect(resolveClassTermWritePlan(academicYearId)).resolves.toEqual({
                ok: false,
                message:
                    "ปีการศึกษาที่เลือกไม่ใช่ปีการศึกษาปัจจุบัน กรุณารีเฟรชหน้าแล้วเลือกใหม่",
            });
            expect(prismaMock.$transaction).not.toHaveBeenCalled();
        },
    );

    it("uses the same current-year rule as import", async () => {
        const { checkImportTerm } = await import(
            "@/lib/services/import-term-policy"
        );
        await expect(checkImportTerm(semesterOne.id)).resolves.toMatchObject({
            kind: "allowed",
        });
        await expect(
            checkImportTerm(previousYearSemesterTwo.id),
        ).resolves.toEqual({ kind: "not_current" });
    });
});

describe("class term writes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.tx.schoolClass.create.mockResolvedValue({
            id: "class-1",
            name: "ม.1/5",
            expectedStudentCount: 30,
        });
    });

    it("creates the class and each planned term row in one transaction", async () => {
        await createSchoolClassWithTerms({
            schoolId: "school-1",
            name: "ม.1/5",
            expectedStudentCount: 30,
            termIds: [semesterOne.id, semesterTwo.id],
        });

        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(prismaMock.tx.schoolClassTerm.create.mock.calls).toEqual([
            [{ data: { schoolClassId: "class-1", academicYearId: semesterOne.id, expectedStudentCount: 30 } }],
            [{ data: { schoolClassId: "class-1", academicYearId: semesterTwo.id, expectedStudentCount: 30 } }],
        ]);
    });

    it("leaves the class count alone when editing a past term", async () => {
        await updateSchoolClassTermCount({
            schoolClassId: "class-1",
            expectedStudentCount: 27,
            plan: {
                targetTermId: semesterOne.id,
                writesClassCount: false,
                newClassTermIds: [],
            },
        });

        expect(prismaMock.tx.schoolClass.update).not.toHaveBeenCalled();
        expect(prismaMock.tx.schoolClassTerm.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: {
                    schoolClassId: "class-1",
                    academicYearId: semesterOne.id,
                    expectedStudentCount: 27,
                },
                update: { expectedStudentCount: 27 },
            }),
        );
    });

    it("updates the class count and the term row for the current term", async () => {
        await updateSchoolClassTermCount({
            schoolClassId: "class-1",
            expectedStudentCount: 35,
            plan: {
                targetTermId: semesterTwo.id,
                writesClassCount: true,
                newClassTermIds: [],
            },
        });

        expect(prismaMock.tx.schoolClass.update).toHaveBeenCalledWith({
            where: { id: "class-1" },
            data: { expectedStudentCount: 35 },
        });
        expect(prismaMock.tx.schoolClassTerm.upsert).toHaveBeenCalledTimes(1);
    });
});
