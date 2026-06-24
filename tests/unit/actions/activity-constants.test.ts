import { describe, expect, it } from "vitest";
import {
    getActivityIndices,
    getActivitySequenceSummary,
} from "@/lib/actions/activity/constants";

describe("getActivityIndices", () => {
    it.each([
        ["orange", [1, 2, 3, 4, 5]],
        ["yellow", [1, 2, 3, 5]],
        ["green", [1, 2, 5]],
    ])("returns the configured sequence for %s", (riskLevel, expected) => {
        expect(getActivityIndices(riskLevel)).toEqual(expected);
    });

    it("returns no activities for a risk level without worksheets", () => {
        expect(getActivityIndices("red")).toEqual([]);
    });

    it("signals the completed state only when every required activity is complete", () => {
        const completeProgress = [1, 2, 5].map((activityNumber) => ({
            activityNumber,
            status: "completed",
        }));

        expect(getActivitySequenceSummary("green", completeProgress)).toEqual(
            {
                completedCount: 3,
                isComplete: true,
            },
        );
    });

    it("keeps the upload workspace active when a required activity is incomplete", () => {
        const incompleteProgress = [
            { activityNumber: 1, status: "completed" },
            { activityNumber: 2, status: "completed" },
            { activityNumber: 5, status: "in_progress" },
        ];

        expect(
            getActivitySequenceSummary("green", incompleteProgress),
        ).toEqual({
            completedCount: 2,
            isComplete: false,
        });
    });
});
