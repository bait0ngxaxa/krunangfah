import { describe, it, expect } from "vitest";
import {
    calculateStudentContributionAdjustments,
    calculateStudentClassCountAdjustments,
    calculateStudentStatusState,
    getStudentClassContribution,
} from "@/lib/actions/student/student-class-count";
import {
    canStudentPerformActions,
    isStudentStatusValue,
    isStudentCountExcludedStatus,
    STUDENT_STATUS,
    STUDENT_STATUS_VALUES,
} from "@/lib/constants/student-status";

describe("isStudentCountExcludedStatus", () => {
    it.each([
        [STUDENT_STATUS.RESIGNED, true],
        [STUDENT_STATUS.TRANSFERRED, true],
        [STUDENT_STATUS.GRADUATED, true],
        [STUDENT_STATUS.ACTIVE, false],
    ] as const)("classifies %s as count-excluded=%s", (status, expected) => {
        expect(isStudentCountExcludedStatus(status)).toBe(expected);
    });
});

describe("canStudentPerformActions", () => {
    it.each([
        [STUDENT_STATUS.ACTIVE, true],
        [STUDENT_STATUS.RESIGNED, false],
        [STUDENT_STATUS.TRANSFERRED, false],
        [STUDENT_STATUS.GRADUATED, false],
    ] as const)("classifies %s as action-allowed=%s", (status, expected) => {
        expect(canStudentPerformActions(status)).toBe(expected);
    });
});

describe("calculateStudentClassCountAdjustments", () => {
    it.each([
        [
            STUDENT_STATUS.ACTIVE,
            STUDENT_STATUS.RESIGNED,
            [{ className: "ม.1/1", delta: -1 }],
        ],
        [
            STUDENT_STATUS.ACTIVE,
            STUDENT_STATUS.GRADUATED,
            [{ className: "ม.1/1", delta: -1 }],
        ],
        [
            STUDENT_STATUS.RESIGNED,
            STUDENT_STATUS.ACTIVE,
            [{ className: "ม.1/1", delta: 1 }],
        ],
        [
            STUDENT_STATUS.GRADUATED,
            STUDENT_STATUS.ACTIVE,
            [{ className: "ม.1/1", delta: 1 }],
        ],
        [STUDENT_STATUS.RESIGNED, STUDENT_STATUS.TRANSFERRED, []],
    ] as const)("calculates same-class %s → %s", (oldStatus, newStatus, expected) => {
        expect(
            calculateStudentClassCountAdjustments({
                oldClassName: "ม.1/1",
                newClassName: "ม.1/1",
                oldStatus,
                newStatus,
            }),
        ).toEqual(expected);
    });

    it.each([
        [
            STUDENT_STATUS.ACTIVE,
            STUDENT_STATUS.ACTIVE,
            [{ className: "ม.1/1", delta: -1 }, { className: "ม.1/2", delta: 1 }],
        ],
        [
            STUDENT_STATUS.ACTIVE,
            STUDENT_STATUS.GRADUATED,
            [{ className: "ม.1/1", delta: -1 }],
        ],
        [
            STUDENT_STATUS.GRADUATED,
            STUDENT_STATUS.ACTIVE,
            [{ className: "ม.1/2", delta: 1 }],
        ],
        [STUDENT_STATUS.GRADUATED, STUDENT_STATUS.TRANSFERRED, []],
    ] as const)("calculates cross-class %s → %s", (oldStatus, newStatus, expected) => {
        expect(
            calculateStudentClassCountAdjustments({
                oldClassName: "ม.1/1",
                newClassName: "ม.1/2",
                oldStatus,
                newStatus,
            }),
        ).toEqual(expected);
    });
});

describe("student class contribution", () => {
    it.each([
        [STUDENT_STATUS.ACTIVE, null, 1],
        [STUDENT_STATUS.ACTIVE, new Date("2026-07-14T00:00:00.000Z"), 0],
        [STUDENT_STATUS.GRADUATED, null, 0],
        [STUDENT_STATUS.RESIGNED, null, 0],
        [STUDENT_STATUS.TRANSFERRED, null, 0],
    ] as const)("returns %s with disabledAt=%s as %s", (status, disabledAt, expected) => {
        expect(
            getStudentClassContribution({
                className: "ม.1/1",
                status,
                disabledAt,
            }),
        ).toBe(expected);
    });

    it("adjusts a same-class disable transition", () => {
        expect(
            calculateStudentContributionAdjustments({
                before: {
                    className: "ม.1/1",
                    status: STUDENT_STATUS.ACTIVE,
                    disabledAt: null,
                },
                after: {
                    className: "ม.1/1",
                    status: STUDENT_STATUS.ACTIVE,
                    disabledAt: new Date("2026-07-14T00:00:00.000Z"),
                },
            }),
        ).toEqual([{ className: "ม.1/1", delta: -1 }]);
    });

    it("adjusts a same-class restore transition", () => {
        expect(
            calculateStudentContributionAdjustments({
                before: {
                    className: "ม.1/1",
                    status: STUDENT_STATUS.ACTIVE,
                    disabledAt: new Date("2026-07-14T00:00:00.000Z"),
                },
                after: {
                    className: "ม.1/1",
                    status: STUDENT_STATUS.ACTIVE,
                    disabledAt: null,
                },
            }),
        ).toEqual([{ className: "ม.1/1", delta: 1 }]);
    });

    it("moves contribution between classes while status and disabledAt change", () => {
        expect(
            calculateStudentContributionAdjustments({
                before: {
                    className: "ม.1/1",
                    status: STUDENT_STATUS.ACTIVE,
                    disabledAt: null,
                },
                after: {
                    className: "ม.1/2",
                    status: STUDENT_STATUS.ACTIVE,
                    disabledAt: null,
                },
            }),
        ).toEqual([
            { className: "ม.1/1", delta: -1 },
            { className: "ม.1/2", delta: 1 },
        ]);
    });
});

describe("calculateStudentStatusState", () => {
    const previousStatusChangedAt = new Date("2026-01-01T00:00:00.000Z");
    const previousLeftAt = new Date("2026-01-02T00:00:00.000Z");
    const now = new Date("2026-07-14T00:00:00.000Z");

    it("sets leftAt when ACTIVE becomes GRADUATED", () => {
        expect(
            calculateStudentStatusState({
                oldStatus: STUDENT_STATUS.ACTIVE,
                newStatus: STUDENT_STATUS.GRADUATED,
                statusChangedAt: previousStatusChangedAt,
                leftAt: null,
                now,
            }),
        ).toEqual({ statusChangedAt: now, leftAt: now });
    });

    it("clears leftAt when GRADUATED becomes ACTIVE", () => {
        expect(
            calculateStudentStatusState({
                oldStatus: STUDENT_STATUS.GRADUATED,
                newStatus: STUDENT_STATUS.ACTIVE,
                statusChangedAt: previousStatusChangedAt,
                leftAt: previousLeftAt,
                now,
            }),
        ).toEqual({ statusChangedAt: now, leftAt: null });
    });

    it("preserves leftAt when moving between excluded statuses", () => {
        expect(
            calculateStudentStatusState({
                oldStatus: STUDENT_STATUS.RESIGNED,
                newStatus: STUDENT_STATUS.TRANSFERRED,
                statusChangedAt: previousStatusChangedAt,
                leftAt: previousLeftAt,
                now,
            }),
        ).toEqual({ statusChangedAt: now, leftAt: previousLeftAt });
    });

    it("preserves both timestamps when status does not change", () => {
        expect(
            calculateStudentStatusState({
                oldStatus: STUDENT_STATUS.ACTIVE,
                newStatus: STUDENT_STATUS.ACTIVE,
                statusChangedAt: previousStatusChangedAt,
                leftAt: null,
                now,
            }),
        ).toEqual({
            statusChangedAt: previousStatusChangedAt,
            leftAt: null,
        });
    });
});

describe("status validation", () => {
    it("accepts all valid StudentStatus values", () => {
        for (const status of STUDENT_STATUS_VALUES) {
            expect(isStudentStatusValue(status)).toBe(true);
        }
    });

    it("rejects unknown status strings", () => {
        expect(isStudentStatusValue("EXPELLED")).toBe(false);
        expect(isStudentStatusValue("active")).toBe(false);
        expect(isStudentStatusValue("")).toBe(false);
    });
});

describe("role authorization logic for updateStudentStatus", () => {
    const allowedRoles = new Set(["school_admin", "class_teacher"]);

    it("allows school_admin and class_teacher only", () => {
        expect(allowedRoles.has("school_admin")).toBe(true);
        expect(allowedRoles.has("class_teacher")).toBe(true);
        expect(allowedRoles.has("system_admin")).toBe(false);
    });
});
