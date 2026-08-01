import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

const mocks = vi.hoisted(() => ({
    getTeacherProfile: vi.fn(),
    requireAuth: vi.fn(),
    userFindUnique: vi.fn(),
    redirect: vi.fn((path: string): never => {
        throw new Error(`REDIRECT:${path}`);
    }),
}));

vi.mock("next/navigation", () => ({
    redirect: mocks.redirect,
    useRouter: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/actions/teacher.actions", () => ({
    getTeacherProfile: mocks.getTeacherProfile,
}));
vi.mock("@/lib/database/prisma", () => ({
    prisma: { user: { findUnique: mocks.userFindUnique } },
}));
vi.mock(
    "@/components/teacher/forms/TeacherProfileForm/TeacherProfileForm",
    () => ({
        TeacherProfileForm: () => <div data-testid="teacher-profile-form" />,
    }),
);

import TeacherProfilePage from "@/app/(onboarding)/teacher-profile/page";

describe("TeacherProfilePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuth.mockResolvedValue({
            user: {
                id: "user-1",
                role: "school_admin",
                isPrimary: true,
                schoolId: null,
            },
        });
    });

    it("continues the existing onboarding redirect when a profile exists", async () => {
        mocks.getTeacherProfile.mockResolvedValue({
            status: "success",
            data: { id: "teacher-1" },
        });
        mocks.userFindUnique.mockResolvedValue({ schoolId: null });

        await expect(TeacherProfilePage()).rejects.toThrow(
            "REDIRECT:/school-setup",
        );
    });

    it("renders TeacherProfileForm only when the profile is genuinely absent", async () => {
        mocks.getTeacherProfile.mockResolvedValue({
            status: "not_found",
            message: "ไม่พบโปรไฟล์ครู",
        });

        const page = await TeacherProfilePage();
        const html = renderToStaticMarkup(page);

        expect(html).toContain("data-testid=\"teacher-profile-form\"");
        expect(mocks.userFindUnique).not.toHaveBeenCalled();
    });

    it("renders QueryErrorState and never renders the form on query failure", async () => {
        mocks.getTeacherProfile.mockResolvedValue({
            status: "transient_error",
            requestId: "teacher-profile-request-1",
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });

        const page = await TeacherProfilePage();

        expect(page.type).toBe(QueryErrorState);
        expect(page.props.requestId).toBe("teacher-profile-request-1");
        expect(page.type).not.toBe("teacher-profile-form");
        expect(mocks.userFindUnique).not.toHaveBeenCalled();
    });

    it("redirects forbidden profile access instead of rendering onboarding", async () => {
        mocks.getTeacherProfile.mockResolvedValue({ status: "forbidden" });

        await expect(TeacherProfilePage()).rejects.toThrow(
            "REDIRECT:/dashboard",
        );
    });
});
