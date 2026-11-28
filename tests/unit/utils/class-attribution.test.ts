import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import {
    attributeResultClass,
    buildAttributedClassSql,
    buildAttributedClassWhere,
    type ClassAttributionInput,
} from "@/lib/utils/class-attribution";

// Current/past term × snapshot present/null. The student was promoted from
// ม.1/1 (assessment) to ม.2/1 (now).
const CASES: Array<{ name: string; input: ClassAttributionInput; expected: ReturnType<typeof attributeResultClass> }> = [
    {
        name: "current term with a snapshot uses the current class",
        input: { isCurrentTerm: true, snapshotClassName: "ม.1/1", currentClassName: "ม.2/1" },
        expected: { className: "ม.2/1", source: "assessment" },
    },
    {
        name: "current term without a snapshot uses the current class",
        input: { isCurrentTerm: true, snapshotClassName: null, currentClassName: "ม.2/1" },
        expected: { className: "ม.2/1", source: "assessment" },
    },
    {
        name: "past term with a snapshot uses the snapshot",
        input: { isCurrentTerm: false, snapshotClassName: "ม.1/1", currentClassName: "ม.2/1" },
        expected: { className: "ม.1/1", source: "assessment" },
    },
    {
        name: "past term without a snapshot falls back to the current class",
        input: { isCurrentTerm: false, snapshotClassName: null, currentClassName: "ม.2/1" },
        expected: { className: "ม.2/1", source: "current_class_fallback" },
    },
];

interface ResultShape {
    className: string | null;
    academicYear: { isCurrent: boolean };
    student: { class: string };
}

/** Evaluates the narrow where shape the helper produces against one result. */
function matchesWhere(where: Prisma.PhqResultWhereInput, result: ResultShape): boolean {
    const branches = where.OR as Array<{
        academicYear: { isCurrent: boolean };
        className?: string | null;
        student?: { class: string };
    }>;
    return branches.some((branch) =>
        branch.academicYear.isCurrent === result.academicYear.isCurrent &&
        (!("className" in branch) || branch.className === result.className) &&
        (branch.student === undefined || branch.student.class === result.student.class),
    );
}

function toResult(input: ClassAttributionInput): ResultShape {
    return {
        className: input.snapshotClassName,
        academicYear: { isCurrent: input.isCurrentTerm },
        student: { class: input.currentClassName },
    };
}

describe("class attribution rule", () => {
    it.each(CASES)("$name", ({ input, expected }) => {
        expect(attributeResultClass(input)).toEqual(expected);
    });

    it.each(CASES)("the Prisma where matches exactly the attributed class: $name", ({ input, expected }) => {
        for (const candidate of ["ม.1/1", "ม.2/1", "ม.3/1"]) {
            expect(matchesWhere(buildAttributedClassWhere(candidate), toResult(input)))
                .toBe(candidate === expected.className);
        }
    });

    it("builds the SQL fragment over the pr, s and ay aliases", () => {
        const fragment = buildAttributedClassSql();

        expect(fragment.sql).toBe(
            '(CASE WHEN ay."isCurrent" THEN s.class ELSE COALESCE(pr."className", s.class) END)',
        );
        expect(fragment.values).toEqual([]);
    });
});
