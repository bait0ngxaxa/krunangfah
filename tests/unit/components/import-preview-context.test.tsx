/** @vitest-environment jsdom */

import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

const mocks = vi.hoisted(() => ({
    getCurrentAcademicYearTerms: vi.fn(),
    getCurrentTeacherProfile: vi.fn(),
    getSchoolClasses: vi.fn(),
    getIncompleteActivityWarning: vi.fn(),
    hasRound1Data: vi.fn(),
    importStudents: vi.fn(),
    routerRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: mocks.routerRefresh }),
}));
vi.mock("@/lib/actions/academic-year.actions", () => ({
    getCurrentAcademicYearTerms: mocks.getCurrentAcademicYearTerms,
}));
vi.mock("@/lib/actions/teacher.actions", () => ({
    getCurrentTeacherProfile: mocks.getCurrentTeacherProfile,
}));
vi.mock("@/lib/actions/school-setup.actions", () => ({
    getSchoolClasses: mocks.getSchoolClasses,
}));
vi.mock("@/lib/actions/student/main", () => ({
    getIncompleteActivityWarning: mocks.getIncompleteActivityWarning,
    hasRound1Data: mocks.hasRound1Data,
}));
vi.mock("@/lib/actions/student/mutations", () => ({
    importStudents: mocks.importStudents,
}));

const { ImportPreview } = await import(
    "@/components/student/import/ImportPreview/ImportPreview"
);
const { useImportPreview } = await import(
    "@/components/student/import/ImportPreview/useImportPreview"
);

function createStudent(
    studentId: string,
    className: string,
): ParsedStudent {
    return {
        studentId,
        nationalId: "1234567890123",
        firstName: "สมชาย",
        lastName: "ใจดี",
        gender: "MALE",
        age: 13,
        class: className,
        scores: {
            q1: 0,
            q2: 0,
            q3: 0,
            q4: 0,
            q5: 0,
            q6: 0,
            q7: 0,
            q8: 0,
            q9: 0,
            q9a: false,
            q9b: false,
        },
    };
}

const students = [
    createStudent("S001", "ม.1/1"),
    createStudent("S002", "ม.1/2"),
];

describe("ImportPreview import context", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getCurrentAcademicYearTerms.mockResolvedValue({
            status: "success",
            data: [{ id: "year-1", year: 2569, semester: 1, isCurrent: true }],
        });
        mocks.getCurrentTeacherProfile.mockResolvedValue({
            status: "success",
            data: {
                advisoryClass: "ทุกห้อง",
                user: { role: "school_admin" },
            },
        });
        mocks.getSchoolClasses.mockResolvedValue({
            status: "success",
            data: [
                { id: "class-1", name: "ม.1/1", expectedStudentCount: 30 },
                { id: "class-2", name: "ม.1/2", expectedStudentCount: 30 },
            ],
        });
        mocks.hasRound1Data.mockResolvedValue({
            status: "success",
            data: false,
        });
        mocks.getIncompleteActivityWarning.mockResolvedValue({
            status: "success",
            data: {
                hasIncomplete: false,
                studentCount: 0,
                activityCount: 0,
                previousRound: 1,
            },
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("shows missing identifier status only to authorized preview viewers", async () => {
        const data = [students[0], { ...students[1], nationalId: null }];
        const props = { data, onCancel: vi.fn(), onSuccess: vi.fn() };
        const { rerender } = render(<ImportPreview {...props} canViewNationalId={false} />);

        expect(await screen.findByText("S002")).toBeTruthy();
        expect(screen.queryByText("ยังไม่มีเลขประจำตัว")).toBeNull();
        expect(screen.queryByText("1234567890123")).toBeNull();

        rerender(<ImportPreview {...props} canViewNationalId />);

        expect(screen.getByText("ยังไม่มีเลขประจำตัว")).toBeTruthy();
        expect(screen.getByText("1234567890123")).toBeTruthy();
    });

    it("uses a class teacher profile to scope the preview to the advisory class", async () => {
        mocks.getCurrentTeacherProfile.mockResolvedValue({
            status: "success",
            data: {
                advisoryClass: "ม.1/2",
                user: { role: "class_teacher" },
            },
        });

        const { result } = renderHook(() =>
            useImportPreview({
                data: students,
                onSuccess: vi.fn(),
            }),
        );

        await waitFor(() => {
            expect(result.current.isImportContextLoaded).toBe(true);
        });
        expect(result.current.hasImportContextError).toBe(false);
        expect(
            result.current.previewData.map((student) => student.studentId),
        ).toEqual(["S002"]);
    });

    it("blocks import and preserves the request ID when profile loading fails", async () => {
        mocks.getCurrentTeacherProfile.mockResolvedValue({
            status: "transient_error",
            requestId: "profile-request-1",
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });

        const { result } = renderHook(() =>
            useImportPreview({
                data: students,
                onSuccess: vi.fn(),
            }),
        );

        await waitFor(() => {
            expect(result.current.isImportContextLoaded).toBe(true);
        });
        expect(result.current.hasImportContextError).toBe(true);
        expect(result.current.importContextQueryError).toEqual({
            requestId: "profile-request-1",
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });
        expect(result.current.teacherProfile).toBeNull();
        expect(result.current.previewData).toEqual([]);
    });

    it.each(["forbidden", "not_found"] as const)(
        "blocks import when the profile result is %s",
        async (status) => {
            mocks.getCurrentTeacherProfile.mockResolvedValue({ status });

            const { result } = renderHook(() =>
                useImportPreview({
                    data: students,
                    onSuccess: vi.fn(),
                }),
            );

            await waitFor(() => {
                expect(result.current.isImportContextLoaded).toBe(true);
            });
            expect(result.current.hasImportContextError).toBe(true);
            expect(result.current.teacherProfile).toBeNull();
        },
    );

    it("shows QueryErrorState, disables save, and hides a ready preview", async () => {
        mocks.getCurrentTeacherProfile.mockResolvedValue({
            status: "transient_error",
            requestId: "profile-request-2",
        });

        await act(async () => {
            render(
                <ImportPreview
                    data={students}
                    onCancel={vi.fn()}
                    onSuccess={vi.fn()}
                    canViewNationalId={false}
                />,
            );
        });

        expect(
            await screen.findByText("รหัสอ้างอิง: profile-request-2"),
        ).toBeTruthy();
        expect(
            screen.getByRole("button", { name: /ตรวจสอบและนำเข้า/ }),
        ).toHaveProperty("disabled", true);
        expect(screen.queryByText("S001")).toBeNull();
    });

    it("keeps round 2 import enabled when round 1 activities are incomplete", async () => {
        mocks.hasRound1Data.mockResolvedValue({
            status: "success",
            data: true,
        });
        mocks.getIncompleteActivityWarning.mockResolvedValue({
            status: "success",
            data: {
                hasIncomplete: true,
                studentCount: 1,
                activityCount: 2,
                previousRound: 1,
            },
        });

        render(
            <ImportPreview
                data={students}
                onCancel={vi.fn()}
                onSuccess={vi.fn()}
                canViewNationalId={false}
            />,
        );

        const saveButton = await screen.findByRole("button", {
            name: /ตรวจสอบและนำเข้า/,
        });
        const roundSelect = screen.getAllByRole("combobox")[1];
        await waitFor(() =>
            expect(
                screen.getByRole("option", { name: "ครั้งที่ 2" }),
            ).toHaveProperty("disabled", false),
        );

        fireEvent.change(roundSelect, { target: { value: "2" } });

        await waitFor(() =>
            expect(mocks.getIncompleteActivityWarning).toHaveBeenCalledWith(
                "year-1",
                2,
                ["ม.1/1", "ม.1/2"],
            ),
        );
        await waitFor(() => expect(saveButton).toHaveProperty("disabled", false));

        fireEvent.click(saveButton);

        expect(
            await screen.findByText(
                "สามารถนำเข้าผลคัดกรองครั้งที่ 2 ได้ตามปกติ",
            ),
        ).toBeTruthy();
        expect(
            screen.getByRole("button", { name: "ยืนยันนำเข้าข้อมูล" }),
        ).toHaveProperty("disabled", false);
    });

    it("keeps round 2 import enabled when no incomplete activities are found", async () => {
        mocks.hasRound1Data.mockResolvedValue({
            status: "success",
            data: true,
        });

        render(
            <ImportPreview
                data={students}
                onCancel={vi.fn()}
                onSuccess={vi.fn()}
                canViewNationalId={false}
            />,
        );

        const saveButton = await screen.findByRole("button", {
            name: /ตรวจสอบและนำเข้า/,
        });
        const roundSelect = screen.getAllByRole("combobox")[1];
        await waitFor(() =>
            expect(
                screen.getByRole("option", { name: "ครั้งที่ 2" }),
            ).toHaveProperty("disabled", false),
        );

        fireEvent.change(roundSelect, { target: { value: "2" } });

        await waitFor(() => expect(saveButton).toHaveProperty("disabled", false));
        expect(mocks.getIncompleteActivityWarning).toHaveBeenCalled();
    });

    it("keeps round 2 import enabled when the incomplete activity lookup fails", async () => {
        mocks.hasRound1Data.mockResolvedValue({
            status: "success",
            data: true,
        });
        mocks.getIncompleteActivityWarning.mockResolvedValue({
            status: "transient_error",
            requestId: "activity-warning-request-1",
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });

        render(
            <ImportPreview
                data={students}
                onCancel={vi.fn()}
                onSuccess={vi.fn()}
                canViewNationalId={false}
            />,
        );

        const saveButton = await screen.findByRole("button", {
            name: /ตรวจสอบและนำเข้า/,
        });
        const roundSelect = screen.getAllByRole("combobox")[1];
        await waitFor(() =>
            expect(
                screen.getByRole("option", { name: "ครั้งที่ 2" }),
            ).toHaveProperty("disabled", false),
        );

        fireEvent.change(roundSelect, { target: { value: "2" } });

        expect(
            await screen.findByText(
                "ไม่สามารถตรวจสอบกิจกรรมค้างได้ในขณะนี้ แต่ยังสามารถนำเข้าผลคัดกรองครั้งที่ 2 ได้ตามปกติ",
            ),
        ).toBeTruthy();
        expect(saveButton).toHaveProperty("disabled", false);
        expect(
            screen.queryByText(/กรุณาเลือกครั้งที่ 1.*ครั้งที่ 2 อีกครั้ง/),
        ).toBeNull();
    });

    it("does not allow selecting round 2 when round 1 is missing", async () => {
        render(
            <ImportPreview
                data={students}
                onCancel={vi.fn()}
                onSuccess={vi.fn()}
                canViewNationalId={false}
            />,
        );

        await screen.findByRole("button", { name: /ตรวจสอบและนำเข้า/ });
        await waitFor(() =>
            expect(
                screen.getByRole("option", { name: /ครั้งที่ 2/ }),
            ).toHaveProperty("disabled", true),
        );
    });
});
