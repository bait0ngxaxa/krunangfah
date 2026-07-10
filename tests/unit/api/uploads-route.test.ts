import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Readable } from "stream";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    createReadStream: vi.fn(),
    existsSync: vi.fn(),
    userFindUnique: vi.fn(),
    homeVisitPhotoFindFirst: vi.fn(),
    canAccessStudentByRole: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));

vi.mock("fs", () => ({
    createReadStream: mocks.createReadStream,
    existsSync: mocks.existsSync,
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: { findUnique: mocks.userFindUnique },
        homeVisitPhoto: { findFirst: mocks.homeVisitPhotoFindFirst },
    },
}));

vi.mock("@/lib/security/student-access", () => ({
    canAccessStudentByRole: mocks.canAccessStudentByRole,
}));

vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));

const { GET } = await import("@/app/api/uploads/[...path]/route");

describe("uploads route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({ user: { id: "teacher-1" } });
        mocks.existsSync.mockReturnValue(true);
        mocks.userFindUnique.mockResolvedValue({
            schoolId: "school-1",
            role: "class_teacher",
            teacher: { advisoryClass: "ม.1/1" },
        });
        mocks.homeVisitPhotoFindFirst.mockResolvedValue({
            homeVisit: {
                student: {
                    disabledAt: null,
                    schoolId: "school-1",
                    class: "ม.1/1",
                    school: { disabledAt: null },
                },
            },
        });
        mocks.canAccessStudentByRole.mockReturnValue(true);
        mocks.createReadStream.mockReturnValue(Readable.from([Buffer.from("image")]));
    });

    it("does not store an authorized student's private image in browser cache", async () => {
        const response = await GET(
            new NextRequest("http://localhost/api/uploads/home-visits/photo.png"),
            { params: Promise.resolve({ path: ["home-visits", "photo.png"] }) },
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    });
});
