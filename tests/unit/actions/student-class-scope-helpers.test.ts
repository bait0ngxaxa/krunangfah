import { describe, expect, it } from "vitest";
import {
    andStudentWhere,
    filterClassesForViewer,
    isClassFilterAllowedForViewer,
} from "@/lib/actions/student/student-scope";

const teacher = { role: "class_teacher", advisoryClass: "ม.1/1" };
const admin = { role: "school_admin", advisoryClass: undefined };

describe("andStudentWhere", () => {
    it.each([
        ["class", { class: "ม.1/1" }],
        ["phqResults", { phqResults: { some: { academicYearId: "term-1" } } }],
        ["referral", { referral: { isNot: null } }],
    ])("keeps an existing top-level %s key", (_key, existing) => {
        const where = andStudentWhere(existing, { class: "ม.1/2" });

        expect(where).toEqual({ ...existing, AND: [{ class: "ม.1/2" }] });
    });

    it("keeps an existing OR intact", () => {
        const or = [{ firstName: "ก" }, { lastName: "ข" }];

        expect(andStudentWhere({ OR: or }, { class: "ม.1/2" })).toEqual({
            OR: or,
            AND: [{ class: "ม.1/2" }],
        });
    });

    it("appends to an existing AND array or single AND object", () => {
        expect(
            andStudentWhere({ AND: [{ id: "a" }] }, { class: "ม.1/2" }),
        ).toEqual({ AND: [{ id: "a" }, { class: "ม.1/2" }] });
        expect(
            andStudentWhere({ AND: { id: "a" } }, { class: "ม.1/2" }),
        ).toEqual({ AND: [{ id: "a" }, { class: "ม.1/2" }] });
    });

    it("does not mutate its input", () => {
        const existing = { class: "ม.1/1", AND: [{ id: "a" }] };

        andStudentWhere(existing, { class: "ม.1/2" });

        expect(existing).toEqual({ class: "ม.1/1", AND: [{ id: "a" }] });
    });
});

describe("isClassFilterAllowedForViewer", () => {
    it("lets a class teacher use their own class or no class", () => {
        expect(isClassFilterAllowedForViewer("ม.1/1", teacher)).toBe(true);
        expect(isClassFilterAllowedForViewer(undefined, teacher)).toBe(true);
        expect(isClassFilterAllowedForViewer("all", teacher)).toBe(true);
    });

    it("rejects another class for a class teacher", () => {
        expect(isClassFilterAllowedForViewer("ม.1/2", teacher)).toBe(false);
        expect(
            isClassFilterAllowedForViewer("ม.1/1", {
                role: "class_teacher",
                advisoryClass: undefined,
            }),
        ).toBe(false);
    });

    it("lets admins filter by any class", () => {
        expect(isClassFilterAllowedForViewer("ม.1/2", admin)).toBe(true);
        expect(
            isClassFilterAllowedForViewer("ม.1/2", { role: "system_admin" }),
        ).toBe(true);
    });
});

describe("filterClassesForViewer", () => {
    it("keeps only the advisory class for a class teacher", () => {
        expect(filterClassesForViewer(["ม.1/1", "ม.1/2"], teacher)).toEqual([
            "ม.1/1",
        ]);
        expect(filterClassesForViewer(["ม.1/2"], teacher)).toEqual([]);
    });

    it("keeps every class for admins", () => {
        expect(filterClassesForViewer(["ม.1/1", "ม.1/2"], admin)).toEqual([
            "ม.1/1",
            "ม.1/2",
        ]);
    });
});
