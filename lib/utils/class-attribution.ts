import { Prisma } from "@prisma/client";

/**
 * The class a PHQ result is reported under (its "attributed class"):
 * - current term: the student's current class. Current-term denominators
 *   (SchoolClassTerm) follow class moves, so the numerator must too.
 * - past term: the class stored at import (PhqResult.className). Past
 *   denominators are frozen, so past numerators use the frozen class.
 *   Results imported before the snapshot existed (NULL) fall back to the
 *   student's current class.
 *
 * Only report filters and grouping use this. Who may see a student stays
 * the student's current class.
 */

export type AttributedClassSource = "assessment" | "current_class_fallback";

export interface ClassAttributionInput {
    isCurrentTerm: boolean;
    snapshotClassName: string | null;
    currentClassName: string;
}

export interface AttributedClass {
    className: string;
    source: AttributedClassSource;
}

export function attributeResultClass(input: ClassAttributionInput): AttributedClass {
    if (input.isCurrentTerm) {
        return { className: input.currentClassName, source: "assessment" };
    }
    if (input.snapshotClassName !== null) {
        return { className: input.snapshotClassName, source: "assessment" };
    }
    return { className: input.currentClassName, source: "current_class_fallback" };
}

/**
 * Raw SQL callers using this fragment must alias phq_results as `pr`,
 * students as `s` and academic_years as `ay`.
 */
export function buildAttributedClassSql(): Prisma.Sql {
    return Prisma.sql`(CASE WHEN ay."isCurrent" THEN s.class ELSE COALESCE(pr."className", s.class) END)`;
}

/** The Prisma equivalent of `buildAttributedClassSql() = className`. */
export function buildAttributedClassWhere(className: string): Prisma.PhqResultWhereInput {
    return {
        OR: [
            { academicYear: { isCurrent: true }, student: { class: className } },
            { academicYear: { isCurrent: false }, className },
            { academicYear: { isCurrent: false }, className: null, student: { class: className } },
        ],
    };
}
