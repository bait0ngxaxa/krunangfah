import { describe, expect, it } from "vitest";
import { getAvailableTeacherRoster } from "@/components/teacher/forms/AddTeacherForm/invite-availability";

const roster = [
    {
        id: "roster-1",
        firstName: "Alex",
        lastName: "Duplicate",
        email: "alex-one@example.com",
        age: 30,
        userRole: "class_teacher" as const,
        advisoryClass: "1/1",
        schoolRole: "Teacher",
        projectRole: "care" as const,
        inviteSent: false,
        status: "draft" as const,
    },
    {
        id: "roster-2",
        firstName: "Alex",
        lastName: "Duplicate",
        email: "alex-two@example.com",
        age: 31,
        userRole: "class_teacher" as const,
        advisoryClass: "1/2",
        schoolRole: "Teacher",
        projectRole: "care" as const,
        inviteSent: false,
        status: "draft" as const,
    },
];

describe("teacher invite roster availability", () => {
    it("does not hide a different roster entry with the same name", () => {
        const available = getAvailableTeacherRoster(roster, [
            { rosterId: "roster-1", email: "alex-one@example.com" },
        ]);

        expect(available.map((teacher) => teacher.id)).toEqual(["roster-2"]);
    });

    it("uses email only for legacy invites without a roster id", () => {
        const available = getAvailableTeacherRoster(roster, [
            { rosterId: null, email: "ALEX-ONE@example.com" },
        ]);

        expect(available.map((teacher) => teacher.id)).toEqual(["roster-2"]);
    });

    it("does not use an invite name as a fallback identity", () => {
        const available = getAvailableTeacherRoster(roster, [
            { rosterId: "unrelated-roster", email: "unrelated@example.com" },
        ]);

        expect(available.map((teacher) => teacher.id)).toEqual([
            "roster-1",
            "roster-2",
        ]);
    });
});
