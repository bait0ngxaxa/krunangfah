import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
    disableSchool: vi.fn(),
    disableStudent: vi.fn(),
    markSchoolAsTestData: vi.fn(),
    markStudentAsTestData: vi.fn(),
    permanentlyDeleteSchool: vi.fn(),
    permanentlyDeleteStudent: vi.fn(),
    restoreSchool: vi.fn(),
    restoreStudent: vi.fn(),
    unmarkSchoolTestData: vi.fn(),
    unmarkStudentTestData: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    requireAdmin: authMocks.requireAdmin,
}));

vi.mock("next/cache", () => ({
    revalidatePath: cacheMocks.revalidatePath,
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        dataManagementEvent: { findMany: vi.fn() },
    },
}));

vi.mock("@/lib/actions/data-management/mutations", () => ({
    disableSchool: actionMocks.disableSchool,
    disableStudent: actionMocks.disableStudent,
    markSchoolAsTestData: actionMocks.markSchoolAsTestData,
    markStudentAsTestData: actionMocks.markStudentAsTestData,
    restoreSchool: actionMocks.restoreSchool,
    restoreStudent: actionMocks.restoreStudent,
    unmarkSchoolTestData: actionMocks.unmarkSchoolTestData,
    unmarkStudentTestData: actionMocks.unmarkStudentTestData,
}));

vi.mock("@/lib/actions/data-management/permanent-delete", () => ({
    permanentlyDeleteSchool: actionMocks.permanentlyDeleteSchool,
    permanentlyDeleteStudent: actionMocks.permanentlyDeleteStudent,
}));

vi.mock("@/lib/actions/data-management/preview", () => ({
    getSchoolDataManagementPreview: vi.fn(),
    getStudentDataManagementPreview: vi.fn(),
}));

vi.mock("@/lib/actions/data-management/search", () => ({
    searchDataManagementTargets: vi.fn(),
}));

import { runDataManagementAction } from "@/lib/actions/data-management.actions";

describe("runDataManagementAction", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        authMocks.requireAdmin.mockResolvedValue({
            user: {
                id: "cmadmin00000000000000001",
                email: "admin@example.com",
                name: "ผู้ดูแลระบบ",
                role: "system_admin",
            },
        });
    });

    it("does not revalidate the data management path when the dispatched mutation fails", async () => {
        actionMocks.disableSchool.mockResolvedValue({
            success: false,
            message: "ไม่พบโรงเรียน",
        });

        const result = await runDataManagementAction("school", "disable", {
            id: "cmpjfvisu001bjx2mezlfvfdl",
            reason: "ตรวจสอบข้อมูลผิด",
        });

        expect(result).toEqual({ success: false, message: "ไม่พบโรงเรียน" });
        expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    });
});
