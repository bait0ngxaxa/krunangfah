import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database/prisma", () => ({
    prisma: {},
}));

import { canAccessStudentByRole } from "@/lib/security/student-access";

describe("canAccessStudentByRole", () => {
    it("allows system_admin for any target", () => {
        expect(
            canAccessStudentByRole(
                { role: "system_admin", schoolId: null, advisoryClass: null },
                { schoolId: "school-1", className: "ม.1/1" },
            ),
        ).toBe(true);
    });

    it("allows school_admin only in same school", () => {
        expect(
            canAccessStudentByRole(
                { role: "school_admin", schoolId: "school-1" },
                { schoolId: "school-1", className: "ม.1/1" },
            ),
        ).toBe(true);

        expect(
            canAccessStudentByRole(
                { role: "school_admin", schoolId: "school-1" },
                { schoolId: "school-2", className: "ม.1/1" },
            ),
        ).toBe(false);
    });

    it("denies school roles when either school id is missing", () => {
        expect(
            canAccessStudentByRole(
                { role: "school_admin", schoolId: null },
                { schoolId: "school-1", className: "ม.1/1" },
            ),
        ).toBe(false);

        expect(
            canAccessStudentByRole(
                { role: "school_admin", schoolId: "school-1" },
                { schoolId: null, className: "ม.1/1" },
            ),
        ).toBe(false);
    });

    it("allows class_teacher only for own advisory class in same school", () => {
        expect(
            canAccessStudentByRole(
                {
                    role: "class_teacher",
                    schoolId: "school-1",
                    advisoryClass: "ม.2/1",
                },
                { schoolId: "school-1", className: "ม.2/1" },
            ),
        ).toBe(true);

        expect(
            canAccessStudentByRole(
                {
                    role: "class_teacher",
                    schoolId: "school-1",
                    advisoryClass: "ม.2/1",
                },
                { schoolId: "school-1", className: "ม.2/2" },
            ),
        ).toBe(false);
    });

    it("denies class_teacher without an advisory class", () => {
        expect(
            canAccessStudentByRole(
                {
                    role: "class_teacher",
                    schoolId: "school-1",
                    advisoryClass: null,
                },
                { schoolId: "school-1", className: "ม.2/1" },
            ),
        ).toBe(false);
    });
});

