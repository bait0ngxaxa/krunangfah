import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import { ensureSchoolClassTermsForAcademicYear } from "@/lib/services/school-class-term-service";

const mocks = vi.hoisted(() => ({
    ensureTerms: vi.fn(),
    resolveTerm: vi.fn(),
    rosterFindMany: vi.fn(),
    inviteFindMany: vi.fn(),
    schoolClassFindMany: vi.fn(),
    userFindUnique: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        schoolTeacherRoster: { findMany: mocks.rosterFindMany },
        teacherInvite: { findMany: mocks.inviteFindMany },
        schoolClass: { findMany: mocks.schoolClassFindMany },
        user: { findUnique: mocks.userFindUnique },
    },
}));
vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear: mocks.ensureTerms,
    resolveSchoolClassTerm: mocks.resolveTerm,
}));
vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: vi.fn(),
}));
vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

const { getSchoolClasses } = await import(
    "@/lib/actions/school-setup.actions"
);
const { getSchoolRoster } = await import(
    "@/lib/actions/teacher-roster.actions"
);

function mockSession(
    role: "system_admin" | "school_admin" | "class_teacher" =
        "school_admin",
): void {
    vi.mocked(requireAuth).mockResolvedValue({
        user: {
            id: "user-1",
            role,
            isPrimary: role === "school_admin",
            schoolId: role === "system_admin" ? null : "school-1",
        },
    } as never);
}

describe("teacher management list queries", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSession();
        vi.mocked(ensureSchoolClassTermsForAcademicYear).mockResolvedValue(
            "year-1",
        );
        mocks.resolveTerm.mockResolvedValue({
            id: "year-1",
            year: 2569,
            semester: 2,
            isCurrent: true,
        });
        vi.mocked(prisma.schoolTeacherRoster.findMany).mockResolvedValue([]);
        vi.mocked(prisma.teacherInvite.findMany).mockResolvedValue([]);
        vi.mocked(prisma.schoolClass.findMany).mockResolvedValue([]);
    });

    describe("getSchoolRoster", () => {
        it("returns empty only after a successful empty query", async () => {
            const result = await getSchoolRoster();

            expect(result).toEqual({ status: "empty", data: [] });
        });

        it("returns success with roster data", async () => {
            vi.mocked(prisma.schoolTeacherRoster.findMany).mockResolvedValue([
                {
                    id: "roster-1",
                    firstName: "สมชาย",
                    lastName: "ใจดี",
                    email: "teacher@example.com",
                    age: 35,
                    userRole: "class_teacher",
                    advisoryClass: "ม.1/1",
                    schoolRole: "ครู",
                    projectRole: "care",
                    inviteSent: false,
                },
            ] as never);

            const result = await getSchoolRoster();

            expect(result.status).toBe("success");
            if (result.status !== "success") {
                throw new Error("Expected roster data");
            }
            expect(result.data[0]).toMatchObject({
                id: "roster-1",
                status: "draft",
            });
        });

        it("returns transient_error when a roster query rejects", async () => {
            vi.mocked(prisma.schoolTeacherRoster.findMany).mockRejectedValue(
                new Error("database timeout"),
            );

            const result = await getSchoolRoster();

            expect(result.status).toBe("transient_error");
            if (result.status !== "transient_error") {
                throw new Error("Expected transient_error");
            }
            expect(result.requestId).toEqual(expect.any(String));
            expect(result).not.toHaveProperty("data");
        });

        it("returns forbidden before querying for a class teacher", async () => {
            mockSession("class_teacher");

            const result = await getSchoolRoster();

            expect(result.status).toBe("forbidden");
            expect(prisma.schoolTeacherRoster.findMany).not.toHaveBeenCalled();
        });
    });

    describe("getSchoolClasses", () => {
        it("returns empty only after a successful empty query", async () => {
            const result = await getSchoolClasses();

            expect(result).toEqual({ status: "empty", data: [] });
        });

        it("uses term-specific counts in a successful result", async () => {
            vi.mocked(prisma.schoolClass.findMany).mockResolvedValue([
                {
                    id: "class-1",
                    name: "ม.1/1",
                    expectedStudentCount: 30,
                    terms: [{ expectedStudentCount: 32 }],
                },
            ] as never);

            const result = await getSchoolClasses("year-1");

            expect(result).toEqual({
                status: "success",
                data: [
                    {
                        id: "class-1",
                        name: "ม.1/1",
                        expectedStudentCount: 32,
                    },
                ],
            });
        });

        it("does not provision rows for a past term and reports absent classes as null", async () => {
            mocks.resolveTerm.mockResolvedValue({
                id: "year-past",
                year: 2569,
                semester: 1,
                isCurrent: false,
            });
            vi.mocked(prisma.schoolClass.findMany).mockResolvedValue([
                { id: "class-1", name: "ม.1/1", terms: [{ expectedStudentCount: 28 }] },
                { id: "class-2", name: "ม.1/5", terms: [] },
            ] as never);

            const result = await getSchoolClasses("year-past");

            expect(ensureSchoolClassTermsForAcademicYear).not.toHaveBeenCalled();
            expect(result).toEqual({
                status: "success",
                data: [
                    { id: "class-1", name: "ม.1/1", expectedStudentCount: 28 },
                    { id: "class-2", name: "ม.1/5", expectedStudentCount: null },
                ],
            });
        });

        it("self-heals the current term before reading it", async () => {
            await getSchoolClasses();

            expect(ensureSchoolClassTermsForAcademicYear).toHaveBeenCalledWith(
                "school-1",
                "year-1",
            );
        });

        it("returns transient_error when ensuring the term rejects", async () => {
            vi.mocked(
                ensureSchoolClassTermsForAcademicYear,
            ).mockRejectedValue(new Error("term query failed"));

            const result = await getSchoolClasses();

            expect(result.status).toBe("transient_error");
            if (result.status !== "transient_error") {
                throw new Error("Expected transient_error");
            }
            expect(result.requestId).toEqual(expect.any(String));
            expect(result).not.toHaveProperty("data");
        });

        it("returns forbidden before querying for a system admin", async () => {
            mockSession("system_admin");

            const result = await getSchoolClasses();

            expect(result.status).toBe("forbidden");
            expect(
                ensureSchoolClassTermsForAcademicYear,
            ).not.toHaveBeenCalled();
        });
    });
});
