import { describe, expect, it } from "vitest";
import {
    getLatestPhqResult,
    getRequestedOrLatestPhqResult,
    isActionableLatestPhqResultId,
} from "@/lib/utils/phq-result-selection";

const phqResults = [
    { id: "latest-result", score: 14 },
    { id: "older-result", score: 9 },
    { id: "oldest-result", score: 4 },
];

describe("getLatestPhqResult", () => {
    it("returns the first result as the latest item", () => {
        expect(getLatestPhqResult(phqResults)).toEqual(phqResults[0]);
    });

    it("returns null when the list is empty", () => {
        expect(getLatestPhqResult([])).toBeNull();
    });
});

describe("getRequestedOrLatestPhqResult", () => {
    it("returns the requested result when found", () => {
        expect(
            getRequestedOrLatestPhqResult(phqResults, "older-result"),
        ).toEqual(phqResults[1]);
    });

    it("falls back to latest when the requested result is missing", () => {
        expect(
            getRequestedOrLatestPhqResult(phqResults, "missing-result"),
        ).toEqual(phqResults[0]);
    });

    it("returns latest when no id is provided", () => {
        expect(getRequestedOrLatestPhqResult(phqResults)).toEqual(
            phqResults[0],
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
    });
});
