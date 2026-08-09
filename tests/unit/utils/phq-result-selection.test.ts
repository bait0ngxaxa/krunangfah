import { describe, expect, it } from "vitest";
import {
    getLatestPhqResult,
    getRequestedOrLatestPhqResult,
    isActionableLatestPhqResultId,
} from "@/lib/utils/phq-result-selection";

const phqResults = [
    {
        id: "backfilled-older-result",
        academicYear: { year: 2568, semester: 1 },
        assessmentRound: 2,
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
    },
    {
        id: "latest-result",
        academicYear: { year: 2569, semester: 2 },
        assessmentRound: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
        id: "older-result",
        academicYear: { year: 2568, semester: 1 },
        assessmentRound: 1,
        createdAt: new Date("2025-06-01T00:00:00.000Z"),
    },
];

describe("getLatestPhqResult", () => {
    it("keeps the newer academic PHQ latest when an older term is backfilled later", () => {
        expect(getLatestPhqResult(phqResults)).toEqual(phqResults[1]);
    });

    it("uses semester, assessment round, and createdAt as ordered tie-breakers", () => {
        const sameYear = phqResults[1].academicYear.year;
        const contexts = [
            {
                id: "semester-1-round-2",
                academicYear: { year: sameYear, semester: 1 },
                assessmentRound: 2,
                createdAt: new Date("2026-03-01T00:00:00.000Z"),
            },
            {
                id: "semester-2-round-1",
                academicYear: { year: sameYear, semester: 2 },
                assessmentRound: 1,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
            },
            {
                id: "semester-2-round-2-older-row",
                academicYear: { year: sameYear, semester: 2 },
                assessmentRound: 2,
                createdAt: new Date("2026-01-02T00:00:00.000Z"),
            },
            {
                id: "semester-2-round-2-newer-row",
                academicYear: { year: sameYear, semester: 2 },
                assessmentRound: 2,
                createdAt: new Date("2026-01-03T00:00:00.000Z"),
            },
        ];

        expect(getLatestPhqResult(contexts)).toEqual(contexts[3]);
    });

    it("returns null when the list is empty", () => {
        expect(getLatestPhqResult([])).toBeNull();
    });
});

describe("getRequestedOrLatestPhqResult", () => {
    it("returns the requested result when found", () => {
        expect(
            getRequestedOrLatestPhqResult(phqResults, "older-result"),
        ).toEqual(phqResults[2]);
    });

    it("falls back to latest when the requested result is missing", () => {
        expect(
            getRequestedOrLatestPhqResult(phqResults, "missing-result"),
        ).toEqual(phqResults[1]);
    });

    it("returns latest when no id is provided", () => {
        expect(getRequestedOrLatestPhqResult(phqResults)).toEqual(
            phqResults[1],
        );
    });
});

describe("isActionableLatestPhqResultId", () => {
    it("returns true only for the latest result id", () => {
        expect(
            isActionableLatestPhqResultId(phqResults, "latest-result"),
        ).toBe(true);
        expect(
            isActionableLatestPhqResultId(phqResults, "older-result"),
        ).toBe(false);
        expect(
            isActionableLatestPhqResultId(
                phqResults,
                "backfilled-older-result",
            ),
        ).toBe(false);
    });
});
