/**
 * Unit Tests: Student Status Logic
 *
 * Covers pure logic extracted from updateStudentStatus:
 * - isInactiveStudentStatus classification
 * - expectedCountDelta calculation for class count adjustment
 */

import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
// Replicate pure logic from lib/actions/student/mutations.ts
// ═══════════════════════════════════════════════════════════

type StudentStatus =
    | "ACTIVE"
    | "RESIGNED"
    | "TRANSFERRED"
    | "GRADUATED";

const COUNT_EXCLUDED_STUDENT_STATUSES = new Set<StudentStatus>([
    "RESIGNED",
    "TRANSFERRED",
]);

function isInactiveStudentStatus(status: StudentStatus): boolean {
    return COUNT_EXCLUDED_STUDENT_STATUSES.has(status);
}

/**
 * Calculate class count adjustment when transitioning between statuses.
 * Returns -1 when student leaves (active→inactive),
 *          +1 when student returns (inactive→active),
 *           0 when category doesn't change.
 */
function calculateExpectedCountDelta(
    oldStatus: StudentStatus,
    newStatus: StudentStatus,
): number {
    const oldInactive = isInactiveStudentStatus(oldStatus);
    const newInactive = isInactiveStudentStatus(newStatus);

    if (oldInactive === newInactive) return 0;
    return newInactive ? -1 : 1;
}

// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════

describe("isInactiveStudentStatus", () => {
    it.each([
        ["RESIGNED", true],
        ["TRANSFERRED", true],
        ["ACTIVE", false],
        ["GRADUATED", false],
    ] as const)(
        "should classify %s as inactive=%s",
        (status, expected) => {
            expect(isInactiveStudentStatus(status)).toBe(expected);
        },
    );
});

describe("calculateExpectedCountDelta", () => {
    describe("active → inactive (decrement)", () => {
        it.each([
            ["ACTIVE", "RESIGNED"],
            ["ACTIVE", "TRANSFERRED"],
            ["GRADUATED", "RESIGNED"],
            ["GRADUATED", "TRANSFERRED"],
        ] as const)(
            "%s → %s should return -1",
            (from, to) => {
                expect(calculateExpectedCountDelta(from, to)).toBe(-1);
            },
        );
    });

    describe("inactive → active (increment)", () => {
        it.each([
            ["RESIGNED", "ACTIVE"],
            ["RESIGNED", "GRADUATED"],
            ["TRANSFERRED", "ACTIVE"],
            ["TRANSFERRED", "GRADUATED"],
        ] as const)(
            "%s → %s should return +1",
            (from, to) => {
                expect(calculateExpectedCountDelta(from, to)).toBe(+1);
            },
        );
    });

    describe("same category (no change)", () => {
        it.each([
            ["ACTIVE", "GRADUATED"],
            ["GRADUATED", "ACTIVE"],
            ["RESIGNED", "TRANSFERRED"],
        ] as const)(
            "%s → %s should return 0",
            (from, to) => {
                // ACTIVE↔GRADUATED both non-inactive → 0
                // RESIGNED↔TRANSFERRED both inactive → 0
                expect(calculateExpectedCountDelta(from, to)).toBe(0);
            },
        );
    });

    describe("edge: same status", () => {
        it.each([
            "ACTIVE",
            "RESIGNED",
            "TRANSFERRED",
            "GRADUATED",
        ] as const)(
            "%s → %s should return 0 (identity)",
            (status) => {
                expect(calculateExpectedCountDelta(status, status)).toBe(0);
            },
        );
    });
});

describe("Role authorization logic for updateStudentStatus", () => {
    type UserRole = "system_admin" | "school_admin" | "class_teacher";

    const ALLOWED_ROLES = new Set<UserRole>(["school_admin", "class_teacher"]);

    function canUpdateStudentStatus(role: UserRole): boolean {
        return ALLOWED_ROLES.has(role);
    }

    it("should allow school_admin", () => {
        expect(canUpdateStudentStatus("school_admin")).toBe(true);
    });

    it("should allow class_teacher", () => {
        expect(canUpdateStudentStatus("class_teacher")).toBe(true);
    });

    it("should deny system_admin", () => {
        expect(canUpdateStudentStatus("system_admin")).toBe(false);
    });
});

describe("Status validation", () => {
    const VALID_STATUSES: readonly string[] = [
        "ACTIVE",
        "RESIGNED",
        "TRANSFERRED",
        "GRADUATED",
    ];

    function isValidStatus(status: string): boolean {
        return VALID_STATUSES.includes(status);
    }

    it("should accept all valid StudentStatus values", () => {
        for (const status of VALID_STATUSES) {
            expect(isValidStatus(status)).toBe(true);
        }
    });

    it("should reject unknown status strings", () => {
        expect(isValidStatus("EXPELLED")).toBe(false);
        expect(isValidStatus("active")).toBe(false);
        expect(isValidStatus("")).toBe(false);
        expect(isValidStatus("SUSPENDED")).toBe(false);
    });
});
