import { describe, expect, it } from "vitest";
import {
    ACTIVITY_INDICES,
    getActivities,
    type Activity,
} from "@/lib/config/help-page-config";

function toIds(activities: Activity[]): string[] {
    return activities.map((activity) => activity.id);
}

describe("help-page-config getActivities", () => {
    it("should derive orange activities from ACTIVITY_INDICES", () => {
        expect(ACTIVITY_INDICES.orange).toEqual([0, 1, 2, 3, 4]);
        expect(toIds(getActivities("orange"))).toEqual([
            "a1",
            "a2",
            "a3",
            "a4",
            "a5",
        ]);
    });

    it("should derive yellow and green activities from ACTIVITY_INDICES", () => {
        expect(ACTIVITY_INDICES.yellow).toEqual([0, 1, 2, 4]);
        expect(ACTIVITY_INDICES.green).toEqual([0, 1, 4]);

        expect(toIds(getActivities("yellow"))).toEqual(["a1", "a2", "a3", "a5"]);
        expect(toIds(getActivities("green"))).toEqual(["a1", "a2", "a5"]);
    });

    it("should return empty list for risk levels without worksheets", () => {
        expect(getActivities("red")).toEqual([]);
        expect(getActivities("blue")).toEqual([]);
    });
});

