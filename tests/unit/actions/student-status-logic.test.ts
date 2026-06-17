/**
 * Unit Tests: Student Status Logic
 *
 * Covers pure logic extracted from updateStudentStatus:
 * - count-excluded status classification
 * - action availability classification
 * - expectedCountDelta calculation for class count adjustment
 */

import { describe, it, expect } from "vitest";
import {
    canStudentPerformActions,
    isStudentStatusValue,
    isStudentCountExcludedStatus,
    STUDENT_STATUS,
    STUDENT_STATUS_VALUES,
    type StudentStatusValue,
} from "@/lib/constants/student-status";

/**
 * Calculate class count adjustment when transitioning between statuses.
 * Returns -1 when student leaves denominator,
 *          +1 when student returns to denominator,
 *           0 when category doesn't change.
 */
function calculateExpectedCountDelta(
    oldStatus: StudentStatusValue,
    newStatus: StudentStatusValue,
): number {
    const oldExcluded = isStudentCountExcludedStatus(oldStatus);
    const newExcluded = isStudentCountExcludedStatus(newStatus);

    if (oldExcluded === newExcluded) return 0;
    return newExcluded ? -1 : 1;
}

// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════

describe("isStudentCountExcludedStatus", () => {
    it.each([
        [STUDENT_STATUS.RESIGNED, true],
        [STUDENT_STATUS.TRANSFERRED, true],
        [STUDENT_STATUS.ACTIVE, false],
        [STUDENT_STATUS.GRADUATED, false],
    ] as const)(
        "should classify %s as count-excluded=%s",
        (status, expected) => {
            expect(isStudentCountExcludedStatus(status)).toBe(expected);
        },
    );
});

describe("canStudentPerformActions", () => {
    it.each([
        [STUDENT_STATUS.ACTIVE, true],
        [STUDENT_STATUS.RESIGNED, false],
        [STUDENT_STATUS.TRANSFERRED, false],
        [STUDENT_STATUS.GRADUATED, false],
    ] as const)("should classify %s as action-allowed=%s", (status, expected) => {
        expect(canStudentPerformActions(status)).toBe(expected);
    });
});

describe("calculateExpectedCountDelta", () => {
    describe("active → inactive (decrement)", () => {
        it.each([
            [STUDENT_STATUS.ACTIVE, STUDENT_STATUS.RESIGNED],
            [STUDENT_STATUS.ACTIVE, STUDENT_STATUS.TRANSFERRED],
            [STUDENT_STATUS.GRADUATED, STUDENT_STATUS.RESIGNED],
            [STUDENT_STATUS.GRADUATED, STUDENT_STATUS.TRANSFERRED],
        ] as const)(
            "%s → %s should return -1",
            (from, to) => {
                expect(calculateExpectedCountDelta(from, to)).toBe(-1);
            },
        );
    });

    describe("inactive → active (increment)", () => {
        it.each([
            [STUDENT_STATUS.RESIGNED, STUDENT_STATUS.ACTIVE],
            [STUDENT_STATUS.RESIGNED, STUDENT_STATUS.GRADUATED],
            [STUDENT_STATUS.TRANSFERRED, STUDENT_STATUS.ACTIVE],
            [STUDENT_STATUS.TRANSFERRED, STUDENT_STATUS.GRADUATED],
        ] as const)(
            "%s → %s should return +1",
            (from, to) => {
                expect(calculateExpectedCountDelta(from, to)).toBe(+1);
            },
        );
    });

    describe("same category (no change)", () => {
        it.each([
            [STUDENT_STATUS.ACTIVE, STUDENT_STATUS.GRADUATED],
            [STUDENT_STATUS.GRADUATED, STUDENT_STATUS.ACTIVE],
            [STUDENT_STATUS.RESIGNED, STUDENT_STATUS.TRANSFERRED],
        ] as const)(
            "%s → %s should return 0",
            (from, to) => {
                expect(calculateExpectedCountDelta(from, to)).toBe(0);
            },
        );
    });

    describe("edge: same status", () => {
        it.each(STUDENT_STATUS_VALUES)(
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
    it("should accept all valid StudentStatus values", () => {
        for (const status of STUDENT_STATUS_VALUES) {
            expect(isStudentStatusValue(status)).toBe(true);
        }
    });

    it("should reject unknown status strings", () => {
        expect(isStudentStatusValue("EXPELLED")).toBe(false);
        expect(isStudentStatusValue("active")).toBe(false);
        expect(isStudentStatusValue("")).toBe(false);
        expect(isStudentStatusValue("SUSPENDED")).toBe(false);
    });
});
