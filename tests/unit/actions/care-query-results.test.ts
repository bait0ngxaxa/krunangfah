import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    counselingCount: vi.fn(),
    homeVisitCount: vi.fn(),
    requireAuth: vi.fn(),
    verifyAccess: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        counselingSession: {
            count: mocks.counselingCount,
            findMany: vi.fn(),
        },
        homeVisit: {
            count: mocks.homeVisitCount,
            findMany: vi.fn(),
        },
    },
}));
vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/security/student-access", () => ({
    verifyStudentAccessForUser: mocks.verifyAccess,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/utils/logging", () => ({ logError: vi.fn() }));

const { getCounselingSessions } = await import("@/lib/actions/counseling.actions");
const { getHomeVisits } = await import("@/lib/actions/home-visit.actions");

describe("care record query results", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuth.mockResolvedValue({
            user: { id: "teacher-1", role: "class_teacher" },
        });
        mocks.verifyAccess.mockResolvedValue({ allowed: true });
    });

    it("does not convert counseling query failures to an empty list", async () => {
        mocks.counselingCount.mockRejectedValue(new Error("database unavailable"));

        const result = await getCounselingSessions("student-1");

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
        });
    });

    it("does not convert home visit query failures to an empty list", async () => {
        mocks.homeVisitCount.mockRejectedValue(new Error("database unavailable"));

        const result = await getHomeVisits("student-1");

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
        });
    });
});
