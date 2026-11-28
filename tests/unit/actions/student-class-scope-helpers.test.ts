import { describe, expect, it } from "vitest";
import {
    filterClassesForViewer,
    isClassFilterAllowedForViewer,
} from "@/lib/actions/student/student-scope";

const teacher = { role: "class_teacher", advisoryClass: "ม.1/1" };
const admin = { role: "school_admin", advisoryClass: undefined };

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
