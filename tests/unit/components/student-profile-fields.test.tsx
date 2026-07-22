import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudentProfileFields } from "@/components/student/profile/StudentProfileEditFields";

describe("StudentProfileFields national ID input", () => {
    it("keeps a G national ID in a 14-character text input", () => {
        const html = renderToStaticMarkup(
            <StudentProfileFields
                form={{
                    studentId: "1001",
                    nationalId: "G1234567890123",
                    firstName: "สมชาย",
                    lastName: "ใจดี",
                    gender: "MALE",
                    age: "13",
                    class: "ม.1/1",
                    status: "ACTIVE",
                }}
                isProfileLocked={false}
                isPending={false}
                updateField={vi.fn()}
            />,
        );

        expect(html).toContain('value="G1234567890123"');
        expect(html).toContain('maxLength="14"');
        expect(html).not.toContain('inputMode="numeric"');
    });
});
