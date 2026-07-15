import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
    applyStudentClassCountAdjustments,
    StudentClassCountIntegrityError,
} from "@/lib/actions/student/student-class-count";

function createTransactionMocks() {
    const classFindUnique = vi.fn().mockResolvedValue({
        id: "class-1",
        expectedStudentCount: 30,
    });
    const classUpdate = vi.fn().mockResolvedValue({
        id: "class-1",
        expectedStudentCount: 30,
    });
    const classUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const termUpsert = vi.fn().mockResolvedValue({ id: "term-1" });
    const termUpdateMany = vi.fn().mockResolvedValue({ count: 1 });

    const tx = {
        schoolClass: {
            findUnique: classFindUnique,
            update: classUpdate,
            updateMany: classUpdateMany,
        },
        schoolClassTerm: {
            upsert: termUpsert,
            updateMany: termUpdateMany,
        },
    } as unknown as Prisma.TransactionClient;

    return { tx, classUpdateMany, termUpsert, termUpdateMany };
}

describe("applyStudentClassCountAdjustments", () => {
    it("uses guarded atomic decrements for class and current-year term", async () => {
        const mocks = createTransactionMocks();

        await applyStudentClassCountAdjustments(mocks.tx, {
            schoolId: "school-1",
            academicYearId: "academic-year-1",
            adjustments: [{ className: "ม.1/1", delta: -1 }],
        });

        expect(mocks.termUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId: "class-1",
                        academicYearId: "academic-year-1",
                    },
                },
                update: { expectedStudentCount: { increment: 0 } },
            }),
        );
        expect(mocks.classUpdateMany).toHaveBeenCalledWith({
            where: { id: "class-1", expectedStudentCount: { gte: 1 } },
            data: { expectedStudentCount: { decrement: 1 } },
        });
        expect(mocks.termUpdateMany).toHaveBeenCalledWith({
            where: { id: "term-1", expectedStudentCount: { gte: 1 } },
            data: { expectedStudentCount: { decrement: 1 } },
        });
    });

    it("uses atomic increments for a restore or class move destination", async () => {
        const mocks = createTransactionMocks();

        await applyStudentClassCountAdjustments(mocks.tx, {
            schoolId: "school-1",
            academicYearId: "academic-year-1",
            adjustments: [{ className: "ม.1/1", delta: 1 }],
        });

        expect(mocks.classUpdateMany).toHaveBeenCalledWith({
            where: { id: "class-1" },
            data: { expectedStudentCount: { increment: 1 } },
        });
        expect(mocks.termUpdateMany).toHaveBeenCalledWith({
            where: { id: "term-1" },
            data: { expectedStudentCount: { increment: 1 } },
        });
    });

    it("fails instead of allowing a guarded decrement below zero", async () => {
        const mocks = createTransactionMocks();
        mocks.classUpdateMany.mockResolvedValue({ count: 0 });

        await expect(
            applyStudentClassCountAdjustments(mocks.tx, {
                schoolId: "school-1",
                academicYearId: "academic-year-1",
                adjustments: [{ className: "ม.1/1", delta: -1 }],
            }),
        ).rejects.toBeInstanceOf(StudentClassCountIntegrityError);
        expect(mocks.termUpdateMany).not.toHaveBeenCalled();
    });

    it("fails when the student's class record is missing", async () => {
        const mocks = createTransactionMocks();
        const classFindUnique = vi.mocked(mocks.tx.schoolClass.findUnique);
        classFindUnique.mockResolvedValue(null);

        await expect(
            applyStudentClassCountAdjustments(mocks.tx, {
                schoolId: "school-1",
                academicYearId: "academic-year-1",
                adjustments: [{ className: "ม.1/1", delta: -1 }],
            }),
        ).rejects.toBeInstanceOf(StudentClassCountIntegrityError);
        expect(mocks.classUpdateMany).not.toHaveBeenCalled();
    });
});
