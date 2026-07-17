import { beforeEach, describe, expect, it, vi } from "vitest";
import { markRosterInviteSent } from "@/lib/actions/teacher-roster.actions";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";

const mocks = vi.hoisted(() => ({
    rosterFindUnique: vi.fn(),
    rosterUpdate: vi.fn(),
    userFindUnique: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        schoolTeacherRoster: {
            findUnique: mocks.rosterFindUnique,
            update: mocks.rosterUpdate,
        },
        user: { findUnique: mocks.userFindUnique },
    },
}));

vi.mock("@/lib/auth/session", () => ({
    requireAuth: vi.fn(),
    requirePrimaryAdmin: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("teacher management action permissions", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.rosterFindUnique.mockResolvedValue({
            id: "roster-1",
            schoolId: "school-1",
        });
        mocks.rosterUpdate.mockResolvedValue({ id: "roster-1" });
    });

    it("class_teacher เรียกเปลี่ยนสถานะ inviteSent โดยตรงไม่ได้", async () => {
        vi.mocked(requireAuth).mockResolvedValue({
            user: {
                id: "teacher-1",
                email: "teacher@example.com",
                name: "ครูทดสอบ",
                image: null,
                role: "class_teacher",
                isPrimary: false,
                schoolId: "school-1",
            },
            expires: new Date(Date.now() + 60_000).toISOString(),
        });

        const result = await markRosterInviteSent("roster-1");

        expect(result.success).toBe(false);
        expect(mocks.rosterUpdate).not.toHaveBeenCalled();
    });
});
