/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportActions } from "@/components/student/import/ImportPreview/components/ImportActions";

// Regression guard: incomplete round-1 activities are advisory only and must
// never disable or gate a round-2 import (school-team decision, fbcd838).
describe("ImportActions incomplete-activity warning", () => {
    afterEach(() => cleanup());

    const baseProps = {
        onCancel: vi.fn(),
        isLoading: false,
        canSave: true,
        studentCount: 3,
        academicYearLabel: "2569 เทอม 1",
        assessmentRound: 2,
        zeroScoreWarning: null,
        numericStudentIdCount: 0,
    };

    it("shows the amber advisory and still lets the user confirm the import", () => {
        const onSave = vi.fn();
        render(
            <ImportActions
                {...baseProps}
                onSave={onSave}
                incompleteWarning={{ hasIncomplete: true, studentCount: 2, activityCount: 3, previousRound: 1 }}
            />,
        );

        const saveButton = screen.getByRole("button", { name: /ตรวจสอบและนำเข้า/ });
        expect(saveButton).toHaveProperty("disabled", false);
        fireEvent.click(saveButton);

        expect(screen.getByText(/ยังมีกิจกรรมจากการคัดกรองครั้งที่\s*1\s*ไม่ครบ/)).toBeTruthy();
        expect(screen.getByText(/สามารถนำเข้าผลคัดกรองครั้งที่\s*2\s*ได้ตามปกติ/)).toBeTruthy();
        const confirm = screen.getByRole("button", { name: "ยืนยันนำเข้าข้อมูล" });
        expect(confirm).toHaveProperty("disabled", false);
        fireEvent.click(confirm);
        expect(onSave).toHaveBeenCalledExactlyOnceWith(0);
    });

    it("keeps canSave as the only gate on the save button", () => {
        render(
            <ImportActions
                {...baseProps}
                canSave={false}
                onSave={vi.fn()}
                incompleteWarning={{ hasIncomplete: false, studentCount: 0, activityCount: 0, previousRound: 1 }}
            />,
        );

        expect(screen.getByRole("button", { name: /ตรวจสอบและนำเข้า/ })).toHaveProperty("disabled", true);
    });
});
