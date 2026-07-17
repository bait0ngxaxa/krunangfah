import { describe, expect, it } from "vitest";
import { getTeacherManagementCapabilities } from "@/lib/auth/teacher-management-policy";

describe("teacher management permission matrix", () => {
    it.each([
        {
            role: "system_admin" as const,
            isPrimary: false,
            expected: [false, false, false, false, false, true, false],
        },
        {
            role: "school_admin" as const,
            isPrimary: true,
            expected: [true, true, true, true, true, true, true],
        },
        {
            role: "school_admin" as const,
            isPrimary: false,
            expected: [true, true, false, true, true, false, false],
        },
        {
            role: "class_teacher" as const,
            isPrimary: false,
            expected: [false, false, false, false, false, false, false],
        },
    ])("กำหนด capability ครบสำหรับ $role (primary=$isPrimary)", ({
        role,
        isPrimary,
        expected,
    }) => {
        const capabilities = getTeacherManagementCapabilities({
            role,
            isPrimary,
        });

        expect(Object.values(capabilities)).toEqual(expected);
    });
});
