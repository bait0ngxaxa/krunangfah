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

    it("rejects permanent delete without reason before calling the mutation", async () => {
        const result = await runDataManagementAction(
            "student",
            "permanent-delete",
            {
                id: "cmpjfvisu001bjx2mezlfvfdl",
                expectedUpdatedAt: new Date("2026-07-15T00:00:00.000Z"),
            },
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain("เหตุผลอย่างน้อย 3 ตัวอักษร");
        expect(actionMocks.permanentlyDeleteStudent).not.toHaveBeenCalled();
    });

    it("rejects permanent delete without expectedUpdatedAt", async () => {
        const result = await runDataManagementAction(
            "student",
            "permanent-delete",
            {
                id: "cmpjfvisu001bjx2mezlfvfdl",
                reason: "ลบข้อมูลทดสอบ",
            },
        );

        expect(result.success).toBe(false);
        expect(actionMocks.permanentlyDeleteStudent).not.toHaveBeenCalled();
    });

    it("rejects an invalid expectedUpdatedAt", async () => {
        const result = await runDataManagementAction(
            "student",
            "permanent-delete",
            {
                id: "cmpjfvisu001bjx2mezlfvfdl",
                reason: "ลบข้อมูลทดสอบ",
                expectedUpdatedAt: "ไม่ใช่วันที่",
            },
        );

        expect(result.success).toBe(false);
        expect(actionMocks.permanentlyDeleteStudent).not.toHaveBeenCalled();
    });

    it("passes the required permanent-delete input and actor to the mutation", async () => {
        actionMocks.permanentlyDeleteStudent.mockResolvedValue({
            success: true,
            message: "ลบถาวรนักเรียนสำเร็จ",
        });
        const expectedUpdatedAt = new Date("2026-07-15T00:00:00.000Z");

        const result = await runDataManagementAction(
            "student",
            "permanent-delete",
            {
                id: "cmpjfvisu001bjx2mezlfvfdl",
                reason: "ลบข้อมูลทดสอบ",
                expectedUpdatedAt,
            },
        );

        expect(result.success).toBe(true);
        expect(actionMocks.permanentlyDeleteStudent).toHaveBeenCalledWith({
            id: "cmpjfvisu001bjx2mezlfvfdl",
            reason: "ลบข้อมูลทดสอบ",
            expectedUpdatedAt,
            actor: expect.objectContaining({ role: "system_admin" }),
        });
        expect(cacheMocks.revalidatePath).toHaveBeenCalled();
    });

    it("keeps non-destructive actions on the existing input shape", async () => {
        actionMocks.disableSchool.mockResolvedValue({
            success: true,
            message: "ปิดใช้งานโรงเรียนสำเร็จ",
        });

        await runDataManagementAction("school", "disable", {
            id: "cmpjfvisu001bjx2mezlfvfdl",
            reason: "ปิดใช้งานข้อมูล",
        });

        expect(actionMocks.disableSchool).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "cmpjfvisu001bjx2mezlfvfdl",
                reason: "ปิดใช้งานข้อมูล",
            }),
        );
        expect(actionMocks.disableSchool.mock.calls[0]?.[0]).not.toHaveProperty(
            "expectedUpdatedAt",
        );
    });

    it("blocks non-system-admin callers before any mutation", async () => {
        authMocks.requireAdmin.mockRejectedValue(
            new Error("Forbidden: Admin access required"),
        );

        const result = await runDataManagementAction(
            "school",
            "permanent-delete",
            {
                id: "cmpjfvisu001bjx2mezlfvfdl",
                reason: "ลบข้อมูลทดสอบ",
                expectedUpdatedAt: new Date("2026-07-15T00:00:00.000Z"),
            },
        );

        expect(result).toEqual({ success: false, message: "ไม่มีสิทธิ์ดำเนินการ" });
        expect(actionMocks.permanentlyDeleteSchool).not.toHaveBeenCalled();
    });
});
